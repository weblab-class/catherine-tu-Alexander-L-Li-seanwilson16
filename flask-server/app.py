from flask import Flask, jsonify, request, render_template, redirect, url_for, send_from_directory
from flask_cors import CORS
import os
import torchaudio
from openunmix import predict

app = Flask(__name__)

CORS(app)

app.config['UPLOAD_FOLDER'] = '../client/src/assets/uploads/'
app.config['PROCESSED_FOLDER'] = '../client/src/assets/processed/'

# Ensure folders exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['PROCESSED_FOLDER'], exist_ok=True)

# @app.route('/')
# def index():
#     return render_template('/client/index.html')
# =======

@app.route('/api/flaskwhoami', methods=['GET'])
def flaskwhoami():
    # Mock user data
    user = {"_id": "12345", "name": "Test User"}
    return jsonify(user)

@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({"message": "Backend and frontend are connected!"})

# @app.route("/dj")
# def dj():
#     return "hi"
    # return render_template('/client/index.html')

# @app.route('/upload', methods=['POST'])
# def upload():
#     file = request.files['file']
#     if file:
#         filename = file.filename
#         filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
#         file.save(filepath)

#         # Process audio
#         process_audio(filepath, filename.split('.')[0])

#         return redirect(url_for('player', filename=filename.split('.')[0]))
#     return redirect(url_for('index'))

# @app.route('/player/<filename>')
# def player(filename):
#     processed_folder = os.path.join(app.config['PROCESSED_FOLDER'], filename)
#     stems = [f"/processed/{filename}/{stem}.wav" for stem in ['vocals', 'bass', 'drums', 'melody']]
#     return render_template('player.html', stems=stems)

# @app.route('/processed/<path:filepath>')
# def serve_processed_file(filepath):
#     return send_from_directory(app.config['PROCESSED_FOLDER'], filepath)

# def process_audio(filepath, output_name):
#     output_dir = os.path.join(app.config['PROCESSED_FOLDER'], output_name)
#     os.makedirs(output_dir, exist_ok=True)

#     # Load audio and get the sample rate
#     audio, rate = torchaudio.load(filepath)

#     # Perform separation using the default umxl model
#     estimates = predict.separate(audio=audio, rate=rate, targets=["vocals", "bass", "drums", "other"])

#     for stem, audio_tensor in estimates.items():
#         # Map "other" to "melody" for clarity
#         stem_name = "melody" if stem == "other" else stem

#         # Ensure the tensor is 2D: [channels, samples]
#         if audio_tensor.ndim == 3:
#             audio_tensor = audio_tensor.squeeze(0)

#         output_file = os.path.join(output_dir, f"{stem_name}.wav")
        
#         # Save the separated stem
#         torchaudio.save(output_file, audio_tensor, sample_rate=rate)

if __name__ == '__main__':
    app.run(debug=True)