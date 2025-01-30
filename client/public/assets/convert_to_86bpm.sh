#!/bin/bash

# Create backup directory
mkdir -p backup

# Function to convert a track to 86 BPM
convert_to_86bpm() {
    local track_dir=$1
    local original_bpm=$2
    
    # Calculate tempo factor (86/original_bpm)
    tempo=$(echo "scale=3; 86/$original_bpm" | bc)
    
    for stem in bass drums other vocals; do
        # Skip if stem doesn't exist
        if [ ! -f "$track_dir/$stem.wav" ]; then
            continue
        fi
        
        # Convert to 86 BPM using temporary file
        ffmpeg -i "$track_dir/$stem.wav" -filter:a "atempo=$tempo" -y "temp/${stem}_86bpm.wav"
        mv "temp/${stem}_86bpm.wav" "$track_dir/$stem.wav"
    done
}

# Create temp directory
mkdir -p temp

# Convert On & On from 80 BPM back to 86 BPM
convert_to_86bpm "processed/NCS_On&On" 80

# Clean up temp directory
rm -rf temp
