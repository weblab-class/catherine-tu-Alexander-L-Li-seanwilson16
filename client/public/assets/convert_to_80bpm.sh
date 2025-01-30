#!/bin/bash

# Create backup directory
mkdir -p backup

# Function to convert a track to 80 BPM
convert_to_80bpm() {
    local track_dir=$1
    local original_bpm=$2
    
    # Calculate tempo factor (80/original_bpm)
    tempo=$(echo "scale=3; 80/$original_bpm" | bc)
    
    for stem in bass drums other vocals; do
        # Skip if stem doesn't exist
        if [ ! -f "$track_dir/$stem.wav" ]; then
            continue
        fi
        
        # Backup original if not already backed up
        if [ ! -f "backup/$(basename $track_dir)_${stem}_original.wav" ]; then
            cp "$track_dir/$stem.wav" "backup/$(basename $track_dir)_${stem}_original.wav"
        fi
        
        # Convert to 80 BPM using temporary file
        ffmpeg -i "$track_dir/$stem.wav" -filter:a "atempo=$tempo" -y "temp/${stem}_80bpm.wav"
        mv "temp/${stem}_80bpm.wav" "$track_dir/$stem.wav"
    done
}

# Create temp directory
mkdir -p temp

# Convert On & On (86 BPM to 80 BPM)
convert_to_80bpm "processed/NCS_On&On" 86

# Convert Let Me Down Slowly (75 BPM to 80 BPM)
convert_to_80bpm "processed/Let_Me_Down_Slowly_Alec_Benjamin" 75

# Convert Chill Guy Remix (already at 80 BPM, no change needed)
# convert_to_80bpm "processed/chill-guy-remix" 80

# Clean up temp directory
rm -rf temp
