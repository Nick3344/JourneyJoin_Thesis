import eventlet
eventlet.monkey_patch()
import os
import json
import traceback
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import or_
from flask_jwt_extended import (
    JWTManager, create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt
)
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from flask_migrate import Migrate
import openai

from config import Config
from models import ChatThread, ChatThreadMapping, db, User, Guide

from azure.communication.chat import ChatClient
from azure.communication.chat import CommunicationTokenCredential
from azure.communication.identity import CommunicationIdentityClient, CommunicationUserIdentifier
from azure.communication.sms import SmsClient
from azure.core.credentials import AzureKeyCredential, AccessToken
#from azure.communication.chat._models import CreateChatThreadRequest
from flask_socketio import SocketIO, emit, join_room, leave_room
from azure.communication.chat import ChatParticipant



class ACSKeyCredential(AzureKeyCredential):
    def get_token(self, *scopes, **kwargs):
        # Return a dummy access token using the key as the token value
        # and a far-future expiry (in epoch seconds). This is a workaround.
        return AccessToken(self._key, 9999999999)
    
'''def subscribe_to_notifications(chat_client, thread_id):
    def on_message_received(event):
        print(f"Message received in thread {event.thread_id}: {event.message_id}")

    chat_client.add_event_handler(ChatEventType.CHAT_MESSAGE_RECEIVED, on_message_received)'''

#connection_string = "endpoint=https://nickcomm.unitedstates.communication.azure.com/;accesskey=2P2k6d0KhkFtEf9mzB3pzVe7VptJtGqYmwEDuVwLiA6v5LgD7gdOJQQJ99BCACULyCpx7CfZAAAAAZCSOuzl"
#chat_client = ChatClient.from_connection_string(connection_string)


openai.api_key = os.getenv("OPENAI_API_KEY")

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    jwt = JWTManager(app)
    migrate = Migrate(app, db)
    #CORS(app)
    CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}}, supports_credentials=True)


    @app.route("/")
    def index():
        return jsonify({"message": "Backend is running!"})
    



    # Initialize SocketIO
    socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

    @socketio.on('connect')
    def handle_connect():
        print(f"Client connected: {request.sid}")
        thread_id = request.args.get('threadId')
        if thread_id:
            join_room(thread_id)
            print(f"Auto-joined thread: {thread_id}")


    @socketio.on("disconnect")
    def handle_disconnect():
        print(f"Client disconnected: {request.sid}")

    @socketio.on("join_thread")
    def handle_join_thread(data):
        thread_id = data.get("threadId")
        if thread_id:
            join_room(thread_id)
            print(f"Client {request.sid} joined thread: {thread_id}")
           # emit("thread_joined", {"status": "success", "threadId": thread_id}, room=request.sid)

    @socketio.on("leave_thread")
    def handle_leave_thread(data):
        thread_id = data.get("threadId")
        if thread_id:
            leave_room(thread_id)
            print(f"Client {request.sid} left thread: {thread_id}")

    @socketio.on("send_message")
    def handle_send_message(data):
        try:
            thread_id = data.get("threadId")
            content = data.get("content")
            sender_display_name = data.get("senderDisplayName", "Unknown")
            acs_user_id = data.get("acs_user_id")
            acs_token = data.get("acs_token")

            if not all([thread_id, content, acs_user_id, acs_token]):
                emit("error", {"error": "Missing required fields"}, room=request.sid)
                return

            # Store message in ACS
            chat_client = create_chat_client(acs_user_id, acs_token)
            thread_client = chat_client.get_chat_thread_client(thread_id)
            
            send_result = thread_client.send_message(
                content=content,
                sender_display_name=sender_display_name
            )

            # Broadcast the message to all clients in the thread
            message_data = {
                "id": send_result.id,
                "threadId": thread_id,
                "content": content,
                "senderDisplayName": sender_display_name,
                "createdOn": datetime.utcnow().isoformat()
            }
            
            emit("new_message", message_data, room=thread_id)
            print(f"Message broadcasted to thread {thread_id}")

        except Exception as e:
            print(f"Error sending message: {str(e)}")
            emit("error", {"error": str(e)}, room=request.sid)
    

    ##########################################################
    # Registration & Login
    ##########################################################
    @app.route("/register", methods=["POST"])
    def register():
        data = request.get_json()
        username = data.get("username")
        password = data.get("password")

        if not username or not password:
            return jsonify({"error": "Username and password are required!"}), 400

        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            return jsonify({"error": "User already exists!"}), 409

        new_user = User(username, password)
        db.session.add(new_user)
        db.session.commit()

        return jsonify({"message": "User registered successfully!"}), 201
    
    @app.route("/login", methods=["POST"])
    def login():
        data = request.get_json()
        username = data.get("username")
        password = data.get("password")

        if not username or not password:
            return jsonify({"error": "Username and password are required!"}), 400

        user = User.query.filter_by(username=username).first()
        if not user or not user.check_password(password):
            return jsonify({"error": "Invalid username or password!"}), 401

        # If the user does not have an ACS ID yet, create one.
        if not user.acs_id:
            connection_string = os.getenv("ACS_CONNECTION_STRING")
            identity_client = CommunicationIdentityClient.from_connection_string(connection_string)
            acs_user = identity_client.create_user()
            user.acs_id = acs_user.properties.get("id", None) if hasattr(acs_user, "properties") else acs_user.id
            db.session.commit()

        # Generate an ACS token for the user
        connection_string = os.getenv("ACS_CONNECTION_STRING")
        # Extract the endpoint from the connection string
        acs_endpoint = None
        for part in connection_string.split(";"):
            if part.startswith("endpoint="):
                acs_endpoint = part.split("=", 1)[1]
                break
        if not acs_endpoint:
            return jsonify({"error": "ACS endpoint missing in connection string."}), 500

        identity_client = CommunicationIdentityClient.from_connection_string(connection_string)
        from azure.communication.identity import CommunicationUserIdentifier
        user_identifier = CommunicationUserIdentifier(user.acs_id)
        token_response = identity_client.get_token(user_identifier, scopes=["chat"])
        acs_token = token_response.token

        # Create your regular JWT tokens
        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))

        return jsonify({
            "message": "Login successful!",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user_acs_id": user.acs_id,
            "user_acs_token": acs_token,
            "acs_endpoint": acs_endpoint
        }), 200






    @app.route("/token/refresh", methods=["POST"])
    @jwt_required(refresh=True)
    def refresh_token():
        current_user_id = get_jwt_identity()
        if not current_user_id:
            return jsonify({"error": "Invalid token"}), 401

        new_access_token = create_access_token(identity=current_user_id)
        return jsonify({"access": new_access_token}), 200

    ##########################################################
    # Profile Endpoints
    ##########################################################
    @app.route("/profile", methods=["GET"])
    @jwt_required()
    def get_profile():
        # Log the request headers to verify the token is attached
        print("DEBUG: Request headers:", dict(request.headers))
        
        current_user_id = get_jwt_identity()  # Should be a string like "5"
        print("DEBUG: JWT identity in GET /profile:", current_user_id)
        
        try:
            user = User.query.get(int(current_user_id))
        except Exception as e:
            print("DEBUG: Exception converting token identity:", e)
            return jsonify({"error": "Invalid token identity format"}), 403

        if not user:
            return jsonify({"error": "User not found"}), 404

        try:
            user_interests = json.loads(user.interests) if user.interests else []
        except Exception as e:
            print("DEBUG: Exception parsing interests:", e)
            user_interests = []

        response = {
            "id": user.id,
            "username": user.username,
            "created_at": str(user.created_at),
            "profile_pic": user.profile_pic,
            "city": user.city,
            "bio": user.bio or "",
            "interests": user_interests,
            "successful_trips": user.successful_trips,
            "credibility_score": user.credibility_score,
        }
        return jsonify(response), 200



    @app.route("/profile", methods=["PUT"])
    @jwt_required()
    def update_profile():
        current_user_id = get_jwt_identity()  # e.g. "5"
        try:
            user = User.query.get(int(current_user_id))
        except Exception as e:
            print("DEBUG: Exception converting user token identity in PUT:", e)
            return jsonify({"error": "Invalid token identity format"}), 403

        if not user:
            return jsonify({"error": "User not found"}), 404

        data = request.get_json()
        if "username" in data:
            user.username = data["username"]
        if "password" in data and data["password"]:
            user.set_password(data["password"])
        if "city" in data:
            user.city = data["city"]
        if "bio" in data:
            user.bio = data["bio"]
        if "interests" in data:
            user.interests = json.dumps(data["interests"])
        if "successful_trips" in data:
            user.successful_trips = data["successful_trips"]
        if "credibility_score" in data:
            user.credibility_score = float(data["credibility_score"])

        db.session.commit()
        return jsonify({"message": "Profile updated successfully"}), 200


    @app.route("/profile/upload-pic", methods=["POST"])
    @jwt_required()
    def upload_profile_pic():
        current_user_id = get_jwt_identity()
        user = User.query.get(int(current_user_id))
        if not user:
            return jsonify({"error": "User not found"}), 404

        if 'file' not in request.files:
            return jsonify({"error": "No file part in the request"}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400

        filename = secure_filename(file.filename)
        unique_filename = f"user_{user.id}_{filename}"
        save_path = os.path.join("static/profile_pics", unique_filename)
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        file.save(save_path)

        user.profile_pic = save_path
        db.session.commit()

        return jsonify({"message": "Profile picture uploaded successfully"}), 200

    ##########################################################
    # GPT-based Recommendation Endpoint
    ##########################################################
    @app.route("/recommend", methods=["POST"])
    def get_recommendations():
        """
        Fetch user recommendations using OpenAI GPT-based API.
        """
        try:
            user_input = request.get_json()  # { city, interests, credibility_score, successful_trips, bio }
            print("Received user input:", user_input)

            # 1) Extract filters from user_input
            city = user_input.get("city", "")
            interests = user_input.get("interests", [])
            credibility_req = user_input.get("credibility_score", 0)
            trips_req = user_input.get("successful_trips", 0)
            bio = user_input.get("bio", "")

            # 2) Query DB for potential users matching the city
            potential_users = User.query.filter_by(city=city).all()

            # Builds a user_list JSON for GPT using real DB data
            user_list = []
            for u in potential_users:
                try:
                    u_interests = json.loads(u.interests) if u.interests else []
                except:
                    u_interests = []
                user_list.append({
                    "id": u.id,  
                    "username": u.username,
                    "city": u.city,
                    "bio": u.bio or "",
                    "interests": u_interests,
                    "profile_pic": u.profile_pic,
                    "successful_trips": u.successful_trips,
                    "credibility_score": u.credibility_score,
                    "acsId": u.acs_id  # include ACS ID in the input list
                })

            user_input["users"] = user_list

            # 3) Build the GPT prompt
            prompt = generate_prompt(user_input)
            print("Generated prompt:", prompt)

            # 4) Call GPT with the actual prompt
            response = openai.ChatCompletion.create(
                model="gpt-4o-mini-2024-07-18", 
                messages=[
                    {"role": "system", "content": "You are a travel recommendation assistant. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=800
            )

            raw_output = response["choices"][0]["message"]["content"]
            print("GPT raw output:", raw_output)

            # 5) Parse GPT's JSON output
            try:
                gpt_recs = json.loads(raw_output)
            except json.JSONDecodeError:
                gpt_recs = {"raw": raw_output}

            # 6) If GPT returned a list, extract recommended IDs and re-query the DB
            final_data = []
            if isinstance(gpt_recs, list):
                rec_ids = [x["id"] for x in gpt_recs if "id" in x]
                print("GPT recommended IDs:", rec_ids)
                matched_db_users = User.query.filter(User.id.in_(rec_ids)).all()
                print("Matched DB users count:", len(matched_db_users))
                # Build a mapping with keys as integers
                db_user_map = {u.id: u for u in matched_db_users}
                for rec in gpt_recs:
                    uid = rec.get("id")
                    if uid in db_user_map:
                        u = db_user_map[uid]
                        try:
                            u_interests = json.loads(u.interests) if u.interests else []
                        except:
                            u_interests = []
                        final_data.append({
                            "id": u.id,
                            "username": u.username,
                            "city": u.city,
                            "bio": u.bio or "",
                            "interests": u_interests,
                            "profile_pic": u.profile_pic,
                            "successful_trips": u.successful_trips,
                            "credibility_score": u.credibility_score,
                            "match_score": rec.get("match_score", 0),
                            "reason": rec.get("reason", ""),
                            "acsId": u.acs_id   # <--- Added ACS ID here
                        })
            else:
                return jsonify({"recommendations": gpt_recs}), 200

            if not final_data:
                return jsonify({"recommendations": [], "note": "No recommendations returned"}), 200

            return jsonify({"recommendations": final_data}), 200

        except Exception as e:
            traceback.print_exc()
            print("Error in /recommend:", e)
            return jsonify({"error": str(e)}), 500


    def generate_prompt(user_input):
        
        city = user_input.get("city", "Unknown")
        interests = user_input.get("interests", [])
        credibility_score = user_input.get("credibility_score", 0)
        successful_trips = user_input.get("successful_trips", 0)
        bio = user_input.get("bio", "")
        users = user_input.get("users", [])

        prompt = f"""
        The user is looking for travel partners in {city}.
        Their interests: {", ".join(interests)}.
        Credibility score: {credibility_score}.
        Successful trips: {successful_trips}.
        Bio: {bio}.

        Here is a list of potential users in JSON:

        {json.dumps(users, indent=2)}

        Please analyze these users and return the top 3 recommended matches in a valid JSON array only.

        Format strictly like this:

        [
        {{
            "id": 123,
            "match_score": 95,
            "reason": "Short reason"
        }},
        ...
        ]

        Do not include any extra text outside the JSON array.
        """
        return prompt



    @app.route("/guide/register", methods=["POST", "OPTIONS"])
    @app.route("/guide/register/", methods=["POST", "OPTIONS"])
    @cross_origin(origins="http://localhost:5173", supports_credentials=True)
    def guide_register():
        if request.method == "OPTIONS":
            response = jsonify({})
            response.status_code = 200
            response.headers["Access-Control-Allow-Origin"] = "http://localhost:5173"
            response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
            return response

        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "No input data provided"}), 400

            username = data.get("username")
            password = data.get("password")
            if not username or not password:
                return jsonify({"error": "Username and password are required"}), 400

            # Check if a guide with this username already exists
            existing_guide = Guide.query.filter_by(username=username).first()
            if existing_guide:
                return jsonify({"error": "Guide with that username already exists"}), 409

            # Create new guide record
            new_guide = Guide(username, password)
            db.session.add(new_guide)
            db.session.commit()

            # Generate tokens with additional guide claim
            access_token = create_access_token(
                identity=f"guide_{new_guide.id}",
                additional_claims={"role": "guide"}
            )
            refresh_token = create_refresh_token(
                identity=f"guide_{new_guide.id}",
                additional_claims={"role": "guide"}
            )

            return jsonify({
                "message": "Guide registered successfully!",
                "access_token": access_token,
                "refresh_token": refresh_token
            }), 201

        except Exception as e:
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500
        

    @app.route("/guide/search", methods=["POST"])
    def search_guides():
        data = request.get_json() or {}
        # Extract search filters
        city = data.get("city", "").strip()
        country = data.get("country", "").strip()
        min_experience = data.get("experience_years", 0)
        min_rating = data.get("rating", 0)
        selected_services = data.get("service_offerings", [])  # Expect an array

        query = Guide.query

        if city:
            # Use case-insensitive matching for city
            query = query.filter(Guide.city.ilike(f"%{city}%"))
        if country:
            query = query.filter(Guide.country.ilike(f"%{country}%"))
        if min_experience:
            query = query.filter(Guide.experience_years >= min_experience)
        if min_rating:
            query = query.filter(Guide.rating >= min_rating)
        if selected_services and isinstance(selected_services, list):
            # Since service_offerings is stored as CSV, build a filter checking if any selected service is in that CSV.
            conditions = []
            for service in selected_services:
                conditions.append(Guide.service_offerings.ilike(f"%{service}%"))
            if conditions:
                query = query.filter(or_(*conditions))

        guides = query.all()

        # Build the results array
        results = []
        for guide in guides:
            offerings_list = []
            if guide.service_offerings:
                offerings_list = [s.strip() for s in guide.service_offerings.split(",") if s.strip()]
            results.append({
                "id": guide.id,
                "username": guide.username,
                "full_name": guide.full_name,
                "contact_email": guide.contact_email,
                "contact_phone": guide.contact_phone,
                "city": guide.city,
                "country": guide.country,
                "bio": guide.bio or "",
                "experience_years": guide.experience_years,
                "rating": guide.rating,
                "service_offerings": offerings_list,
                "tour_details": guide.tour_details or "",
                "profile_pic": guide.profile_pic  
            })

        return jsonify(results), 200




    @app.route("/guide/login", methods=["POST"])
    def guide_login():
        data = request.get_json()
        username = data.get("username")
        password = data.get("password")

        if not username or not password:
            return jsonify({"error": "Username and password are required"}), 400

        guide = Guide.query.filter_by(username=username).first()
        if not guide or not guide.check_password(password):
            return jsonify({"error": "Invalid guide username or password!"}), 401

        # Create tokens with identity as a string (e.g., "9")
        access_token = create_access_token(identity=str(guide.id),
                                        additional_claims={"role": "guide"})
        refresh_token = create_refresh_token(identity=str(guide.id),
                                            additional_claims={"role": "guide"})

        return jsonify({
            "message": "Guide login successful!",
            "access_token": access_token,
            "refresh_token": refresh_token
        }), 200




        
    @app.route("/guide/profile/upload-pic", methods=["POST"])
    @jwt_required()
    def guide_upload_profile_pic():
        # Now we assume get_jwt_identity() returns a numeric string (e.g., "6")
        try:
            guide_id = int(get_jwt_identity())
        except Exception as e:
            return jsonify({"error": "Invalid token identity format"}), 403

        guide = Guide.query.get(guide_id)
        if not guide:
            return jsonify({"error": "Guide not found"}), 404

        if 'file' not in request.files:
            return jsonify({"error": "No file part in the request"}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400

        filename = secure_filename(file.filename)
        unique_filename = f"guide_{guide.id}_{filename}"
        save_path = os.path.join("static/profile_pics", unique_filename)
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        file.save(save_path)

        guide.profile_pic = save_path
        db.session.commit()

        return jsonify({"message": "Guide profile picture uploaded successfully"}), 200


        
    
    @app.route("/guide/profile", methods=["GET"])
    @jwt_required()
    def get_guide_profile():
        current_guide_id = get_jwt_identity()  
        print("DEBUG: JWT identity in GET /guide/profile:", current_guide_id)
        
        try:
            guide = Guide.query.get(int(current_guide_id))
        except Exception as e:
            print("DEBUG: Exception converting token identity:", e)
            return jsonify({"error": "Invalid token identity format"}), 403

        if not guide:
            return jsonify({"error": "Guide not found"}), 404

        offerings_list = []
        if guide.service_offerings:
            offerings_list = [o.strip() for o in guide.service_offerings.split(",") if o.strip()]

        return jsonify({
            "id": guide.id,
            "username": guide.username,
            "full_name": guide.full_name,
            "contact_email": guide.contact_email,
            "contact_phone": guide.contact_phone,
            "city": guide.city,
            "country": guide.country,
            "bio": guide.bio or "",
            "experience_years": guide.experience_years,
            "rating": guide.rating,
            "service_offerings": offerings_list,
            "tour_details": guide.tour_details or ""
        }), 200


    @app.route("/guide/profile", methods=["PUT"])
    @jwt_required()
    def update_guide_profile():
        current_guide_id = get_jwt_identity()
        print("DEBUG: JWT identity in PUT /guide/profile:", current_guide_id)
        try:
            guide = Guide.query.get(int(current_guide_id))
        except Exception as e:
            print("DEBUG: Exception converting token identity in PUT:", e)
            return jsonify({"error": "Invalid token identity format"}), 403

        if not guide:
            return jsonify({"error": "Guide not found"}), 404

        data = request.get_json() or {}
        print("DEBUG: Received PUT data:", data)

        try:
            guide.full_name = data.get("full_name", guide.full_name)
            guide.contact_email = data.get("contact_email", guide.contact_email)
            guide.contact_phone = data.get("contact_phone", guide.contact_phone)
            guide.city = data.get("city", guide.city)
            guide.country = data.get("country", guide.country)
            guide.bio = data.get("bio", guide.bio)

            if "experience_years" in data:
                guide.experience_years = int(data["experience_years"])
            if "rating" in data:
                guide.rating = float(data["rating"])

            if "service_offerings" in data and isinstance(data["service_offerings"], list):
                guide.service_offerings = ", ".join(data["service_offerings"])
            if "tour_details" in data:
                guide.tour_details = data["tour_details"]

            print("DEBUG: Guide object before commit:", guide.__dict__)
            db.session.commit()
            return jsonify({"message": "Guide profile updated successfully"}), 200
        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500




    @app.route("/recommend/guides", methods=["POST"])
    def recommend_guides():
        try:
            # 1. Extract search filters from request body
            data = request.get_json() or {}
            city = data.get("city", "").strip()
            country = data.get("country", "").strip()
            min_experience = data.get("experience_years", 0)
            min_rating = data.get("rating", 0.0)
            selected_services = data.get("service_offerings", [])

            print("Received guide search input:", data)

            # 2. Query the Guide table based on filters
            query = Guide.query
            if city:
                query = query.filter(Guide.city.ilike(f"%{city}%"))
            if country:
                query = query.filter(Guide.country.ilike(f"%{country}%"))
            if min_experience:
                query = query.filter(Guide.experience_years >= min_experience)
            if min_rating:
                query = query.filter(Guide.rating >= min_rating)
            if selected_services and isinstance(selected_services, list):
                from sqlalchemy import or_
                conditions = []
                for service in selected_services:
                    conditions.append(Guide.service_offerings.ilike(f"%{service}%"))
                if conditions:
                    query = query.filter(or_(*conditions))
            potential_guides = query.all()

            # 3. Build a list of potential guide dictionaries
            guide_list = []
            for guide in potential_guides:
                services_list = []
                if guide.service_offerings:
                    services_list = [s.strip() for s in guide.service_offerings.split(",") if s.strip()]
                guide_list.append({
                    "id": guide.id,
                    "full_name": guide.full_name,
                    "city": guide.city,
                    "country": guide.country,
                    "bio": guide.bio or "",
                    "experience_years": guide.experience_years,
                    "rating": guide.rating,
                    "service_offerings": services_list,
                    "profile_pic": guide.profile_pic or ""
                })

            # 4. Build the GPT prompt for guide recommendation
            prompt = f"""
            The user is searching for local guides in city: {city}, country: {country}.
            They require a minimum of {min_experience} years of experience and a rating of at least {min_rating}.
            They are interested in these service offerings: {", ".join(selected_services)}.
            
            Below is a JSON list of potential guides:
            {json.dumps(guide_list, indent=2)}
            
            Please analyze these guides and return the top 3 recommended matches as a valid JSON array only.
            Each recommended guide object should have:
            {{
            "id": <guide_id>,
            "match_score": <number>,
            "reason": "<brief explanation>"
            }}
            Return only the JSON array with no extra text.
            """
            print("Generated prompt for GPT:", prompt)

            # 5. Use the second OpenAI API key for guides
            openai.api_key = os.getenv("OPENAI_API_KEY_GUIDES")
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",  # or your preferred model
                messages=[
                    {"role": "system", "content": "You are a local guide recommendation assistant."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=800
            )

            raw_output = response["choices"][0]["message"]["content"]
            print("GPT raw output:", raw_output)

            # 6. Parse GPT's JSON output
            try:
                gpt_matches = json.loads(raw_output)
            except json.JSONDecodeError:
                gpt_matches = []
                print("Warning: GPT output is not valid JSON.")

            # 7. Merge GPT recommendations with DB data
            final_recommendations = []
            if isinstance(gpt_matches, list):
                recommended_ids = [match.get("id") for match in gpt_matches if "id" in match]
                matched_guides = Guide.query.filter(Guide.id.in_(recommended_ids)).all()
                guide_map = {guide.id: guide for guide in matched_guides}
                for match in gpt_matches:
                    gid = match.get("id")
                    if gid in guide_map:
                        guide = guide_map[gid]
                        services_list = []
                        if guide.service_offerings:
                            services_list = [s.strip() for s in guide.service_offerings.split(",") if s.strip()]
                        final_recommendations.append({
                            "id": guide.id,
                            "full_name": guide.full_name,
                            "city": guide.city,
                            "country": guide.country,
                            "bio": guide.bio or "",
                            "experience_years": guide.experience_years,
                            "rating": guide.rating,
                            "service_offerings": services_list,
                            "profile_pic": guide.profile_pic or "",
                            "match_score": match.get("match_score", 0),
                            "reason": match.get("reason", "")
                        })

            # 8. Return the final recommendations
            return jsonify({"recommendations": final_recommendations}), 200

        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500



    def build_guide_prompt(data, guide_list):
        city = data.get("city", "")
        country = data.get("country", "")
        min_exp = data.get("experience_years", 0)
        min_rating = data.get("rating", 0.0)
        serv_offerings = data.get("service_offerings", [])

        guides_json = json.dumps(guide_list, indent=2)

        prompt = f"""
        The user is looking for local guides in the city: {city}, country: {country},
        with minimum experience of {min_exp} years, minimum rating of {min_rating},
        and interested in these services: {", ".join(serv_offerings)}.

        Below is a list of potential guides in JSON:

        {guides_json}

        Please analyze these guides and return the top 3 recommended matches as valid JSON array only.
        Each recommended item should look like:
        {{
        "id": <guide_id>,
        "match_score": <number>,
        "reason": "<brief reason>"
        }}

        Return just the JSON array, no extra text.
        """
        return prompt

    

    def create_chat_client(acs_user_id=None, acs_token=None):
        connection_string = os.getenv("ACS_CONNECTION_STRING")
        if not connection_string:
            raise ValueError("ACS_CONNECTION_STRING environment variable is not set.")

        parts = connection_string.split(";")
        endpoint = None
        for part in parts:
            if part.startswith("endpoint="):
                endpoint = part.split("=", 1)[1]
        if not endpoint:
            raise ValueError("Invalid ACS_CONNECTION_STRING format: missing endpoint.")

        # If a token is provided, use it; otherwise, generate a new one.
        if acs_token is None:
            identity_client = CommunicationIdentityClient.from_connection_string(connection_string)
            if acs_user_id:
                user = CommunicationUserIdentifier(acs_user_id)
            else:
                user = identity_client.create_user()
            token_response = identity_client.get_token(user, scopes=["chat"])
            acs_token = token_response.token

        credential = CommunicationTokenCredential(acs_token)
        chat_client = ChatClient(endpoint, credential)
        return chat_client


    @app.route("/acs/chat/find_or_create_thread", methods=["POST"])
    def find_or_create_thread():
        try:
            data = request.get_json()
            current_user_id = data.get("current_user_id")
            other_user_id = data.get("other_user_id")
            acs_token = data.get("acs_token")
            
            if not all([current_user_id, other_user_id, acs_token]):
                return jsonify({"error": "Missing required fields"}), 400

            # Create chat client using participant1's token (sender)
            chat_client = create_chat_client(current_user_id, acs_token)
            
            # First try to find an existing thread between the two users
            existing_thread = None
            threads = chat_client.list_chat_threads()
            for thread in threads:
                participants = list(thread.list_participants())
                # Use identifier.raw_id for both participants
                participant_ids = [
                    p.identifier.raw_id if hasattr(p.identifier, "raw_id") else str(p.identifier)
                    for p in participants
                ]
                if current_user_id in participant_ids and other_user_id in participant_ids:
                    existing_thread = thread
                    break

            if existing_thread:
                return jsonify({
                    "threadId": existing_thread.id,
                    "topic": existing_thread.topic,
                    "createdOn": existing_thread.created_on.isoformat()
                }), 200

            # No thread exists: create a new one.
            topic = f"Chat between {current_user_id} and {other_user_id}"
            # Create the thread (without participants)
            create_result = chat_client.create_chat_thread({"topic": topic})
            thread_id = create_result.chat_thread.id
            thread_client = chat_client.get_chat_thread_client(thread_id)

            # Build proper ChatParticipant objects for both users.
            participants = [
                ChatParticipant(
                    identifier=CommunicationUserIdentifier(current_user_id),
                    display_name="User 1"
                ),
                ChatParticipant(
                    identifier=CommunicationUserIdentifier(other_user_id),
                    display_name="User 2"
                )
            ]
            # Add participants using the add_participants method.
            thread_client.add_participants(participants=participants)
            
            # Optionally store the thread mapping in your local DB...
            new_mapping = ChatThreadMapping(
                thread_id=thread_id,
                participant1_id=current_user_id,
                participant2_id=other_user_id,
                topic=topic
            )
            db.session.add(new_mapping)
            db.session.commit()

            return jsonify({
                "threadId": thread_id,
                "topic": topic,
                "createdOn": create_result.chat_thread.created_on.isoformat()
            }), 201

        except Exception as e:
            db.session.rollback()
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    @app.route("/acs/chat/create_thread", methods=["POST"])
    def create_chat_thread():
        """
        Expects JSON with:
        {
        "topic": "My first chat thread",
        "participants": [
            {
            "id": "<ACS Communication Identifier>",
            "displayName": "Alice"
            },
            ...
        ]
        }
        """
        try:
            data = request.get_json()
            topic = data.get("topic", "General Topic")
            participants = data.get("participants", [])
            
            chat_client = create_chat_client()

            # Convert the participant list to the ACS required format
            # Each participant must have:
            # {
            #    "id": <CommunicationIdentifier>,
            #    "displayName": <str>
            # }
            response = chat_client.create_chat_thread(
                topic=topic,
                participants=participants  
            )
            
            # response is a CreateChatThreadResult
            chat_thread = response.chat_thread
            thread_id = chat_thread.id
            
            return jsonify({
                "threadId": thread_id,
                "topic": chat_thread.topic
            }), 200

        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500
        
        
    @app.route("/acs/chat/threads", methods=["GET"])
    def list_chat_threads():
        try:
            acs_user_id = request.args.get("acs_user_id")
            acs_token = request.args.get("acs_token")

            if not acs_user_id or not acs_token:
                return jsonify({"error": "acs_user_id and acs_token are required"}), 400

            print(f"Fetching threads for user {acs_user_id}")

            # Get all threads where the user is either participant1 or participant2
            thread_mappings = ChatThreadMapping.query.filter(
                (ChatThreadMapping.participant1_id == acs_user_id) |
                (ChatThreadMapping.participant2_id == acs_user_id)
            ).all()

            threads = []
            chat_client = create_chat_client(acs_user_id, acs_token)

            for mapping in thread_mappings:
                try:
                    thread_client = chat_client.get_chat_thread_client(mapping.thread_id)
                    
                    # Get the other participant's ID
                    other_participant_id = (
                        mapping.participant2_id 
                        if mapping.participant1_id == acs_user_id 
                        else mapping.participant1_id
                    )

                    threads.append({
                        "thread_id": mapping.thread_id,
                        "topic": mapping.topic,
                        "created_on": mapping.created_at.isoformat(),
                        "other_participant_id": other_participant_id
                    })
                except Exception as e:
                    print(f"Error processing thread {mapping.thread_id}: {str(e)}")
                    continue

            print(f"Found {len(threads)} threads for user {acs_user_id}")
            return jsonify(threads), 200

        except Exception as e:
            print(f"Error in list_chat_threads: {str(e)}")
            return jsonify({"error": str(e)}), 500
        
    @app.route("/acs/chat/add_participant", methods=["POST"])
    def add_participant_to_thread():
        """
        Expects JSON like:
        {
        "threadId": "<chat thread ID from ACS>",
        "participant": {
            "id": "<ACS user ID>",
            "displayName": "Bob"
        }
        }
        """
        try:
            data = request.get_json()
            thread_id = data["threadId"]
            participant = data["participant"]  # e.g. { "id": "...", "displayName": "Bob" }

            chat_client = create_chat_client()
            thread_client = chat_client.get_chat_thread_client(thread_id)

            thread_client.add_participants(participants=[participant])
            return jsonify({"message": "Participant added successfully"}), 200
        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500
        

    @app.route("/acs/chat/send_message", methods=["POST"])
    def send_message_to_thread():
        try:
            data = request.get_json()
            thread_id = data.get("threadId")
            content = data.get("content")
            sender_display_name = data.get("senderDisplayName")
            acs_user_id = data.get("acs_user_id")
            acs_token = data.get("acs_token")

            # Send message through ACS
            chat_client = create_chat_client(acs_user_id, acs_token)
            thread_client = chat_client.get_chat_thread_client(thread_id)
            send_result = thread_client.send_message(
                content=content,
                sender_display_name=sender_display_name
            )

            # Broadcast the message via WebSocket
            message_data = {
                "id": send_result.id,
                "threadId": thread_id,
                "content": content,
                "senderDisplayName": sender_display_name,
                "createdOn": datetime.utcnow().isoformat()
            }
            socketio.emit("new_message", message_data, room=thread_id)

            return jsonify(message_data), 200

        except Exception as e:
            print(f"Error in send_message: {str(e)}")
            return jsonify({"error": str(e)}), 500




        
    @app.route("/acs/chat/get_messages", methods=["POST"])
    def get_messages():
        print("Received get_messages request")  # Debug log
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "No JSON data received"}), 400
                    
            thread_id = data.get("threadId")
            acs_user_id = data.get("acs_user_id")
            acs_token = data.get("acs_token")
                
            print(f"Processing request - ThreadId: {thread_id}, UserId: {acs_user_id}")  # Debug log
                
            if not all([thread_id, acs_user_id, acs_token]):
                missing = []
                if not thread_id: missing.append("threadId")
                if not acs_user_id: missing.append("acs_user_id")
                if not acs_token: missing.append("acs_token")
                return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

            # Create chat client using the provided user's token
            chat_client = create_chat_client(acs_user_id, acs_token)
            thread_client = chat_client.get_chat_thread_client(thread_id)
                
            # Check if the requester is actually a participant
            participants = list(thread_client.list_participants())
            participant_ids = [
                p.identifier.raw_id if hasattr(p.identifier, "raw_id") else str(p.identifier)
                for p in participants
            ]
            print("Thread participants:", participant_ids)
            if acs_user_id not in participant_ids:
                return jsonify({"error": "Requester is not a participant in this thread"}), 403

            # Fetch messages
            messages = []
            messages_iterator = thread_client.list_messages()
            for msg in messages_iterator:
                # msg.content might be an object; adjust as needed according to your SDK version.
                messages.append({
                    "id": msg.id,
                    "content": msg.content.message if hasattr(msg.content, "message") else msg.content,
                    "senderDisplayName": msg.sender_display_name or "Unknown",
                    "createdOn": msg.created_on.isoformat() if msg.created_on else None,
                    "threadId": thread_id
                })
                
            print(f"Found {len(messages)} messages")  # Debug log
            return jsonify(messages), 200
                
        except Exception as e:
            import traceback
            print("Error in get_messages:", str(e))
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    @app.route("/acs/chat/send_message", methods=["POST"])
    def send_message():
        try:
            data = request.get_json()
            print(f"Received message data: {data}") # Add logging
            
            thread_id = data.get("threadId")
            content = data.get("content")
            sender_display_name = data.get("senderDisplayName")
            acs_user_id = data.get("acs_user_id")
            acs_token = data.get("acs_token")
            
            if not all([thread_id, content, acs_user_id, acs_token]):
                return jsonify({"error": "Missing required fields"}), 400
            
            chat_client = create_chat_client(acs_user_id, acs_token)
            thread_client = chat_client.get_chat_thread_client(thread_id)
            
            send_result = thread_client.send_message(
                content=content,
                sender_display_name=sender_display_name
            )
            
            print(f"Message sent successfully: {send_result.id}") # Add logging
            
            socketio.emit("new_message", {
                "id": send_result.id,
                "threadId": thread_id,
                "content": content,
                "senderDisplayName": sender_display_name,
                "createdOn": datetime.utcnow().isoformat()
            }, room=thread_id)
            
            return jsonify({
                "messageId": send_result.id,
                "status": "Message sent successfully"
            }), 200
            
        except Exception as e:
            print(f"Error in send_message: {str(e)}") # Add logging
            return jsonify({"error": str(e)}), 500


    '''@app.route("/acs/chat/create_or_get_thread", methods=["POST"])
    def create_or_get_thread():
        """
        Expects JSON like:
        {
        "participant1_id": "acsUserIdA",
        "participant2_id": "acsUserIdB",
        "topic": "UserA and UserB Chat"
        }
        Returns { "threadId": "...", "createdNew": true/false }
        """
        try:
            data = request.get_json()
            participant1_id = data["participant1_id"]
            participant2_id = data["participant2_id"]
            topic = data.get("topic", "New Chat Thread")

            existing_thread_id = check_existing_thread_in_db(participant1_id, participant2_id)
            if existing_thread_id:
                return jsonify({"threadId": existing_thread_id, "createdNew": False}), 200

            chat_client = create_chat_client()

            participants = [
                {
                    "id": {"communicationUserId": participant1_id},
                    "displayName": "User1"  # Replace with the actual display name if available
                },
                {
                    "id": {"communicationUserId": participant2_id},
                    "displayName": "User2"  # Replace with the actual display name if available
                }
            ]

            chat_thread_request = {
                "topic": topic,
                "participants": participants
            }

            response = chat_client.create_chat_thread(chat_thread_request)
            new_thread_id = response.chat_thread.id

            store_new_thread_in_db(participant1_id, participant2_id, new_thread_id)

            return jsonify({"threadId": new_thread_id, "createdNew": True}), 200

        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500


    def check_existing_thread_in_db(userA, userB):
        return None

    def store_new_thread_in_db(userA, userB, thread_id):
        pass'''
        
    '''def store_new_thread_in_db(userA, userB, thread_id, topic, participants):
        """
        Insert a record linking userA and userB to the ACS thread.
        - participants should be a list of dicts with keys: "id", "displayName".
        """
        new_thread = ChatThread(
            thread_id=thread_id,
            topic=topic,
            participants=participants,
            last_updated=datetime.utcnow()
        )
        db.session.add(new_thread)
        db.session.commit()'''

    @app.route("/acs/chat/create_or_get_thread", methods=["POST"])
    def create_or_get_thread():
        try:
            data = request.get_json()
            participant1_id = data.get("participant1_id")  # sender
            participant2_id = data.get("participant2_id")  # receiver
            acs_token = data.get("acs_token")
            topic = data.get("topic", "New Chat")

            print(f"Creating/getting thread for {participant1_id} and {participant2_id}")

            if not all([participant1_id, participant2_id, acs_token]):
                return jsonify({"error": "Missing required fields"}), 400

            # First check our database for existing thread
            existing_mapping = ChatThreadMapping.query.filter(
                ((ChatThreadMapping.participant1_id == participant1_id) & 
                (ChatThreadMapping.participant2_id == participant2_id)) |
                ((ChatThreadMapping.participant1_id == participant2_id) & 
                (ChatThreadMapping.participant2_id == participant1_id))
            ).first()

            if existing_mapping:
                print(f"Found existing thread: {existing_mapping.thread_id}")
                return jsonify({
                    "threadId": existing_mapping.thread_id,
                    "topic": existing_mapping.topic,
                    "createdNew": False
                }), 200

            # Create new thread
            chat_client = create_chat_client(participant1_id, acs_token)
            
            # Create thread first
            create_thread_result = chat_client.create_chat_thread(topic=topic)
            thread_id = create_thread_result.chat_thread.id
            thread_client = chat_client.get_chat_thread_client(thread_id)

            # Add both participants to the thread
            participants = [
                ChatParticipant(
                    identifier=CommunicationUserIdentifier(participant1_id),
                    display_name="User 1"  
                ),
                ChatParticipant(
                    identifier=CommunicationUserIdentifier(participant2_id),
                    display_name="User 2"
                )
            ]
            
            print(f"Adding participants to thread {thread_id}")
            thread_client.add_participants(participants)

            # Store in our database
            new_mapping = ChatThreadMapping(
                thread_id=thread_id,
                participant1_id=participant1_id,
                participant2_id=participant2_id,
                topic=topic
            )
            db.session.add(new_mapping)
            db.session.commit()

            print(f"Created new thread: {thread_id}")
            
            # Emit socket event to notify receiver
            socketio.emit('new_thread', {
                'threadId': thread_id,
                'topic': topic,
                'participants': [participant1_id, participant2_id]
            }, room=participant2_id)  # Send to receiver's room

            return jsonify({
                "threadId": thread_id,
                "topic": topic,
                "createdNew": True
            }), 200

        except Exception as e:
            db.session.rollback()
            import traceback
            traceback.print_exc()
            print(f"Error creating/getting thread: {str(e)}")
            return jsonify({"error": str(e)}), 500




    @app.route("/acs/chat/send_read_receipt", methods=["POST"])
    def send_read_receipt():
        """
        Expects JSON like:
        {
        "threadId": "...",
        "messageId": "...",  # the message ID you want to mark as read
        }
        """
        try:
            data = request.get_json()
            thread_id = data["threadId"]
            message_id = data["messageId"]

            chat_client = create_chat_client()
            thread_client = chat_client.get_chat_thread_client(thread_id)
            thread_client.send_read_receipt(message_id)
            return jsonify({"status": "read receipt sent"}), 200
        except Exception as e:
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500
    
    @app.route("/acs/chat/list_participants", methods=["POST"])
    def list_chat_participants():
        """
        Expects JSON:
        {
        "threadId": "<chat thread ID>",
        "acs_user_id": "<the user for whom we want to generate a token>"
        }
        Returns a list of participants from ACS's perspective.
        """
        try:
            data = request.get_json()
            thread_id = data["threadId"]
            acs_user_id = data["acs_user_id"]
            if not thread_id or not acs_user_id:
                return jsonify({"error": "threadId and acs_user_id are required"}), 400

            chat_client = create_chat_client(acs_user_id=acs_user_id)
            thread_client = chat_client.get_chat_thread_client(thread_id)
            participant_iter = thread_client.list_participants()
            participants_list = []

            for p in participant_iter:
                participants_list.append({
                    "raw_id": p.id.raw_id if hasattr(p.id, "raw_id") else str(p.id),
                    "display_name": p.display_name
                })

            return jsonify(participants_list), 200
        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    @socketio.on("connect")
    def on_connect():
        print("Client connected (again)")

    @socketio.on("join_thread")
    def on_join_thread(data):
        # join_room logic
        thread_id = data.get("threadId")
        if thread_id:
            join_room(thread_id)
            print(f"Client joined thread: {thread_id}")


    app.socketio = socketio  
    return app




if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        db.create_all()  
    #app.run(debug=True, port=5000)
    app.socketio.run(app, debug=True, port=5000)



