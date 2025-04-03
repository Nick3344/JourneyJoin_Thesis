import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/GuideMatches.css";

function GuideMatches() {
  const navigate = useNavigate();
  const location = useLocation();

  const { recommendedGuides = [] } = location.state || {};

  // We expect recommendedGuides to be an array of 3 (or fewer/more) items
  // each with fields like id, full_name, city, country, etc.

  const [selectedGuide, setSelectedGuide] = useState(null);

  const handleGuideClick = (guide) => {
    setSelectedGuide(guide);
  };

  return (
    <div className="guide-matches-container">
      <div className="guide-matches-left">
        <h2>Recommended Guides</h2>
        {recommendedGuides.length === 0 ? (
          <p>No recommended guides found.</p>
        ) : (
          recommendedGuides.map((guide) => (
            <div
              key={guide.id}
              className={`guide-list-item ${
                selectedGuide && selectedGuide.id === guide.id ? "selected" : ""
              }`}
              onClick={() => handleGuideClick(guide)}
            >
              <p className="guide-list-name">{guide.full_name || `Guide #${guide.id}`}</p>
              {guide.city && guide.country && (
                <p className="guide-list-city">
                  {guide.city}, {guide.country}
                </p>
              )}
              {guide.match_score && (
                <p className="guide-list-score">Score: {guide.match_score}</p>
              )}
            </div>
          ))
        )}
      </div>

      <div className="guide-matches-right">
        {selectedGuide ? (
          <div className="guide-details">
            <h2>{selectedGuide.full_name || `Guide #${selectedGuide.id}`}</h2>
            {selectedGuide.profile_pic ? (
              <img
                src={`http://127.0.0.1:5000/${selectedGuide.profile_pic}`}
                alt="Guide"
                className="guide-details-pic"
              />
            ) : (
              <div className="guide-details-pic-placeholder">
                No Profile Photo
              </div>
            )}
            <p>
              <strong>City:</strong> {selectedGuide.city || "N/A"}
            </p>
            <p>
              <strong>Country:</strong> {selectedGuide.country || "N/A"}
            </p>
            <p>
              <strong>Experience:</strong>{" "}
              {selectedGuide.experience_years || 0} years
            </p>
            <p>
              <strong>Rating:</strong> {selectedGuide.rating || 0}
            </p>
            {selectedGuide.service_offerings && selectedGuide.service_offerings.length > 0 && (
              <div>
                <strong>Service Offerings:</strong>
                <ul>
                  {selectedGuide.service_offerings.map((service, idx) => (
                    <li key={idx}>{service}</li>
                  ))}
                </ul>
              </div>
            )}
            <p>
              <strong>Bio:</strong> {selectedGuide.bio || "N/A"}
            </p>
            {selectedGuide.reason && (
              <p>
                <strong>Reason:</strong> {selectedGuide.reason}
              </p>
            )}
          </div>
        ) : (
          <div className="guide-details-placeholder">
            <h3>Select a guide to see details</h3>
          </div>
        )}
      </div>
    </div>
  );
}

export default GuideMatches;
