🎯 Intern Project: Media Utility Tool (Local → Server Ready)
📌 Objective
Build simple, clean UI tools for common video & image processing tasks (all TASK into one UI).
The application must run on a local PC first, and with minor changes be deployable on a server later.
Each intern will pick ONE task from the list below and design it end-to-end (UI + backend logic).
🧩 TASK LIST (Choose ONE)
Task 1: Video → Images
Functionality
Convert single or multiple videos into images
Options:
Extract every Nth frame
Extract by total frame count
Output images in a selected folder
UI Expectations
Upload video(s)
Input:
Frame interval OR total frames
Progress bar + total images generated
Clear success / error messages
Bonus
Preview first extracted frame
Option to resize images
Task 2: Video Trim (Time-Based)
Functionality
Crop video using start time & end time
in single video multiple trim
Support multiple format videos
Output cropped video(s)
Trim two videos at the same time using start & end time 
UI Expectations
Upload video(s)
Inputs:
Start time (HH:MM:SS)
End time (HH:MM:SS)
Show video duration
Status + output file path
Bonus
Multiple time segments
Preview cropped clip
Merge multiple trimmed clips into one output
Task 3: Video Format Converter
Functionality
Convert any video format → MP4
Single or multiple files
also convert in h264(like handbrake done in Living liquid)
UI Expectations
Upload video(s)
Show:
Input format
Output format (MP4)
Conversion progress
Error handling for unsupported formats
Bonus
Resolution selection (720p / 1080p)
Compression option
Task 4: Image Format Converter
Functionality
Convert any image → JPG
Single or multiple images
UI Expectations
Upload images or folder
Output folder selection
Count:
Total images
Successfully converted
Clean UI feedback
Bonus
Quality slider
Resize option
Task 5: Image Separation / Classification
Functionality
Separate images into folders based on:
File review
User-defined rules
Example:
wrong_fire_imge → false
realweapon_img → true
also can add multiple folder
UI Expectations
image properly view if any size
scrollable view
Final count per folder
Bonus
Undo last operation
CSV or txt report files if needed give download only then need csv generated
after last image on screen overall count make look good
Task 6: Polygon ROI Annotation Tool
Functionality
Draw polygon ROI on images
Create multiple polygons per image
Edit polygon
Delete polygon
Duplicate polygon
Undo / Redo actions
Support multiple polygon classes/options
Save polygon coordinates in:
Normal pixel values (x, y)
Normalized values (0–1)
UI Expectations
Upload single or multiple images
Zoom & Pan support
Smooth polygon editing
List of all polygons with edit/delete options
Save annotation file
Clear success/error messages
Bonus
Keyboard shortcuts
Copy polygon to next image
Different colors for different polygon classes
🧩 TASK 7: Bounding Box Annotation Tool
📌 Functionality
Draw bounding boxes on images or videos with customizable colors and text labels.
Draw bounding box on image or video frame
Resize, move, edit bounding box
Delete bounding box
Multiple bounding boxes per image/video
Choose bounding box color
Add custom text/label to each bounding box
🖥️ UI Expectations
Upload
Upload image(s) or video(s)
Drag & Drop supported
Annotation Panel
Draw bounding box using mouse
Select bounding box color
Enter label/text
Choose text color
Choose line thickness
Edit/Delete bounding box
Multiple bounding boxes supported
🧩 Task 8: Video Merge Tool
📌 Functionality
Merge two, three, or multiple videos into a single output video.
Features
Upload 2 or more videos
Support any common video format (MP4, AVI, MOV, MKV, WMV, FLV, WEBM, MPEG, M4V, TS, etc.)
Automatically convert unsupported combinations if required
Merge videos in the selected order
Drag & Drop to reorder videos
Display video information:
Duration
Resolution
FPS
Format
Maintain original quality or allow re-encoding
Output merged video in selected folder
Support H.264 (MP4) output for maximum compatibility
Handle videos with different resolutions, frame rates, and codecs
🖥️ UI Expectations
Upload
Upload two, three, or multiple videos
Drag & Drop supported
Display uploaded file list
🛠️ TECH REQUIREMENTS (IMPORTANT)
Language: Python
Backend options:
Flask / FastAPI (preferred)
UI:
Simple web UI (HTML/CSS/JS)
OR
Streamlit (acceptable)
Must run on:
Local PC
Server-ready (no hardcoded paths)
📦 DELIVERABLES
Each intern must submit:
✅ Working UI
✅ Clean, readable code
✅ README.md with:
How to run locally
Input / output explanation
✅ Screenshots or short demo video
✅ Error handling & user-friendly messages
⭐ EVALUATION CRITERIA
UI clarity & usability
Code quality & structure
Performance on large files
Clear messaging & logs
Ease of moving from local → server
🚀 GOAL
This is not just a script.
Think like a real product that a non-technical user can use confidently.
📢 Discussion Before Starting
We will discuss the implementation and UI flow before development starts.
You can complete this task:
Individually, or
As a team.
Each task should be developed separately or as team. Additionally, one individual or one team can work on integrating all tasks into a single unified UI after discussing the overall architecture.



Tasks

Assigned To

Video → Images (Task 1)

Tanmay & Mansavi

Video Trim (Task 2)

Shravani & Suraj

Video Format Converter (Task 3)

Deepraj & Vaishnavi

Image Format Converter (Task 4)

Ritesh & Nikita

Image Separation / Classification (Task 5)

Harshal & Swati

Polygon ROI Annotation Tool (Task 6)

Ashaz & Sanika

Bounding Box Annotation Tool (Task 7)

Harsh & Megha

Video Merge Tool (Task 8)

Harshal & Abbu

