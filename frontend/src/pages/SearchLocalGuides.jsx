import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "../styles/SearchLocalGuides.css";

function SearchLocalGuides() {
  const navigate = useNavigate();

  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [rating, setRating] = useState("");
  const [selectedServices, setSelectedServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const possibleServices = [
    "City Tours",
    "Food Tours",
    "Historical Tours",
    "Adventure Activities",
    "Nightlife Guiding",
    "Cultural Experiences",
    "Shopping Assistance",
    "Transportation Services",
    "Photography Guide",
    "Custom Private Tours"
  ];

  const handleCheckboxChange = (service) => {
    if (selectedServices.includes(service)) {
      setSelectedServices(selectedServices.filter((s) => s !== service));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const payload = {
      city,
      country,
      experience_years: Number(experienceYears),
      rating: Number(rating),
      service_offerings: selectedServices
    };

    console.log("Guide search payload:", payload);
    try {
        const payload = {
            city,
            country,
            experience_years: Number(experienceYears),
            rating: Number(rating),
            service_offerings: selectedServices
          };
        const res = await api.post("/recommend/guides", payload);
        const recommendedGuides = res.data.recommendations || [];
        navigate("/local-guides/matches", { state: { recommendedGuides } });

    } catch (err) {
      console.error("Error fetching guide recommendations:", err);
      setError("Error fetching guide recommendations. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-local-guides-container">
      <h2>Find Local Guides</h2>
      <form onSubmit={handleSubmit} className="search-local-guides-form">
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
          <label>Country:</label>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Enter country"
          />
        </div>
        <div className="form-group">
          <label>Min Experience (years):</label>
          <input
            type="number"
            value={experienceYears}
            onChange={(e) => setExperienceYears(e.target.value)}
            placeholder="e.g., 2"
          />
        </div>
        <div className="form-group">
          <label>Min Rating (0-5):</label>
          <input
            type="number"
            step="0.1"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            placeholder="e.g., 4"
          />
        </div>
        <div className="form-group">
          <label>Service Offerings:</label>
          <div className="checkbox-group">
            {possibleServices.map((service) => (
              <label key={service} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={selectedServices.includes(service)}
                  onChange={() => handleCheckboxChange(service)}
                />
                {service}
              </label>
            ))}
          </div>
        </div>
        <button type="submit" className="find-guides-button">
          Search Guides
        </button>
      </form>

      {loading && <p className="loading-indicator">Searching for guides...</p>}
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

export default SearchLocalGuides;
