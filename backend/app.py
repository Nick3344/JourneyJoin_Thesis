import os
import json
import traceback
from datetime import timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import (
    JWTManager, create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity
)
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from flask_migrate import Migrate
import openai

from config import Config
from models import db, User

openai.api_key = os.getenv("OPENAI_API_KEY")

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    jwt = JWTManager(app)
    migrate = Migrate(app, db)
    CORS(app)

    @app.route("/")
    def index():
        return jsonify({"message": "Backend is running!"})

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

        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))

        return jsonify({
            "message": "Login successful!",
            "access_token": access_token,
            "refresh_token": refresh_token
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
        current_user_id = get_jwt_identity()
        user = User.query.get(int(current_user_id))
        if not user:
            return jsonify({"error": "User not found"}), 404

        try:
            user_interests = json.loads(user.interests) if user.interests else []
        except:
            user_interests = []

        response = {
            "id": user.id,
            "username": user.username,
            "created_at": user.created_at,
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
        current_user_id = get_jwt_identity()
        user = User.query.get(int(current_user_id))
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
                    "credibility_score": u.credibility_score
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
                            "reason": rec.get("reason", "")
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


    return app

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        db.create_all()  
    app.run(debug=True, port=5000)



