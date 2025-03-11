import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; 
import api from "../api";
import "../styles/FindPeople.css";

function FindPeople() {
  const navigate = useNavigate(); 

  const [city, setCity] = useState("");
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [credibilityScore, setCredibilityScore] = useState(0);
  const [successfulTrips, setSuccessfulTrips] = useState(0);
  const [bio, setBio] = useState("");

  // Interests to display as checkboxes
  const interestOptions = [
    "Hiking",
    "City Tours",
    "Beach Vacations",
    "Adventure Sports",
    "Foodie",
    "Party",
    "Nightlife",
    "Culture",
    "Spa & Wellness"
  ];

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleInterestChange = (interest) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const payload = {
      city,
      interests: selectedInterests,
      credibility_score: credibilityScore,
      successful_trips: successfulTrips,
      bio
    };

    try {
      // Send payload to /recommend (which calls the LLM)
      const res = await api.post("/recommend", payload, { timeout: 300000 });
      console.log("recommend response:", res);

      const users = res.data.recommendations || [];
      if (users.length === 0) {
        // If the LLM returns an empty array, set an error message.
        setError("No recommendations returned. Please adjust your filters and try again.");
      } else {
        // Navigate to /matches with the recommended users.
        navigate("/matches", { state: { recommendedUsers: users } });
      }
    } catch (err) {
      console.error("Error in handleSubmit:", err);
      setError("Error fetching recommendations. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="find-people-container">
      <h2>Find People</h2>
      <form onSubmit={handleSubmit} className="find-people-form">
        <div className="form-group">
          <label>City:</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Enter city"
          />
        </div>
        <div className="form-group">
          <label>Your Bio (optional):</label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Describe your travel style or preferences..."
          />
        </div>
        <div className="form-group">
          <label>Interests:</label>
          <div className="checkboxes-container">
            {interestOptions.map((interest) => (
              <div key={interest} className="checkbox-item">
                <input
                  type="checkbox"
                  id={interest}
                  checked={selectedInterests.includes(interest)}
                  onChange={() => handleInterestChange(interest)}
                />
                <label htmlFor={interest}>{interest}</label>
              </div>
            ))}
          </div>
        </div>
        <div className="form-group small-inline">
          <label>Minimum Credibility Score:</label>
          <input
            type="number"
            min="0"
            max="5"
            value={credibilityScore}
            onChange={(e) => setCredibilityScore(Number(e.target.value))}
          />
        </div>
        <div className="form-group small-inline">
          <label>Minimum Successful Trips:</label>
          <input
            type="number"
            min="0"
            value={successfulTrips}
            onChange={(e) => setSuccessfulTrips(Number(e.target.value))}
          />
        </div>
        <button type="submit" className="submit-button">Search</button>
      </form>

      {loading && <div className="loading-indicator">Loading recommendations...</div>}
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}

export default FindPeople;
