from flask import Flask, request, jsonify
import google.generativeai as genai
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

@app.route("/gemini", methods=["POST"])
def gemini_response():
    data = request.get_json()
    user_input = data.get("prompt", "")
    if not user_input:
        return jsonify({"response": "Please provide a message."})
    
    model = genai.GenerativeModel("gemini-pro")
    response = model.generate_content(user_input)
    return jsonify({"response": response.text})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
