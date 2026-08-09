# backend/api/v1/controllers/nid_scanner_controller.py
"""Business logic for the NID Scanner plugin.

Handles base64 image decoding, dual/single image processing,
pytesseract OCR with pre-processing, automatic signature detection and cropping,
and robust regex parsing with scoring to extract vital NID fields.
"""

import base64
import re
import cv2
import numpy as np
import pytesseract

def decode_base64_image(base64_str):
    """Decode a base64 image string (with or without data URI scheme) into an OpenCV image."""
    if not base64_str:
        return None
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
        img_bytes = base64.b64decode(base64_str)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        print(f"Error decoding base64 image: {e}")
        return None

def encode_image_to_base64(img):
    """Encode an OpenCV image into a base64 string with PNG format."""
    if img is None or img.size == 0:
        return ""
    try:
        _, buffer = cv2.imencode('.png', img)
        base64_bytes = base64.b64encode(buffer)
        return "data:image/png;base64," + base64_bytes.decode('utf-8')
    except Exception as e:
        print(f"Error encoding image to base64: {e}")
        return ""

def preprocess_image_for_ocr(img, scale_factor=2):
    """Apply high-quality image pre-processing to optimize OCR accuracy.
    
    Includes grayscale conversion, scaling up to improve small text detection,
    and adaptive/Otsu thresholding.
    """
    if img is None:
        return []
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Preprocessing 1: Original size grayscale
    _, thresh_orig = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)
    
    # Preprocessing 2: Resized grayscale
    large = cv2.resize(gray, (0, 0), fx=scale_factor, fy=scale_factor, interpolation=cv2.INTER_CUBIC)
    
    # Preprocessing 3: Otsu thresholding on resized
    _, thresh_large = cv2.threshold(large, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Preprocessing 4: Adaptive thresholding on resized
    adaptive = cv2.adaptiveThreshold(large, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
    
    return [
        {"image": gray, "desc": "Grayscale"},
        {"image": thresh_orig, "desc": "Grayscale Thresh"},
        {"image": large, "desc": "Large Grayscale"},
        {"image": thresh_large, "desc": "Large Otsu Thresh"},
        {"image": adaptive, "desc": "Large Adaptive Thresh"}
    ]

def extract_text_with_fallback(img):
    """Run OCR on the image using different pre-processing techniques and return merged text."""
    if img is None:
        return ""
    
    merged_texts = []
    
    # Get raw OCR text first
    try:
        raw_text = pytesseract.image_to_string(img, lang='ben+eng')
        merged_texts.append(raw_text)
    except Exception as e:
        print(f"Raw OCR error: {e}")
        
    # Get preprocessed OCR texts
    preprocessed_versions = preprocess_image_for_ocr(img)
    for version in preprocessed_versions:
        try:
            txt = pytesseract.image_to_string(version["image"], lang='ben+eng')
            merged_texts.append(txt)
        except Exception as e:
            print(f"OCR failed for {version['desc']}: {e}")
            
    # Join with a distinct separator to prevent cross-line blending but allow regex parsing
    return "\n---SUB-OCR---\n".join(merged_texts)

def clean_value(val):
    """Clean the extracted text field of trailing characters and excess whitespace."""
    if not val:
        return ""
    # Strip common OCR noise, punctuation, vertical bars, and slashes at the edges
    val = re.sub(r'^[:：|/\\,\s.-]+|[:：|/\\,\s.-]+$', '', val)
    return val.strip()

def has_bengali(text):
    """Check if a string contains Bengali Unicode characters."""
    return bool(re.search(r'[\u0980-\u09FF]', text))

def is_english_letters_only(text):
    """Check if a string contains English letters, spaces, dots, and hyphens only."""
    return bool(re.match(r'^[A-Za-z\s.-]+$', text))

def extract_signature(back_img):
    """Extract and crop the holder signature dynamically from the back NID card.
    
    Looks in the middle-bottom-left region of the card, filters noise contours,
    and returns a base64 encoded PNG.
    """
    if back_img is None:
        return ""
    
    try:
        bh, bw, bc = back_img.shape
        
        # Candidate signature region: middle-bottom-left of the card back side
        # X: 5% to 55% of width
        # Y: 45% to 75% of height
        x1 = int(bw * 0.05)
        x2 = int(bw * 0.55)
        y1 = int(bh * 0.45)
        y2 = int(bh * 0.75)
        
        sig_area = back_img[y1:y2, x1:x2]
        
        # Segment handwritten strokes (dark lines on lighter background)
        gray = cv2.cvtColor(sig_area, cv2.COLOR_BGR2GRAY)
        gray_inv = cv2.bitwise_not(gray)
        _, thresh = cv2.threshold(gray_inv, 50, 255, cv2.THRESH_BINARY)
        
        # Find contours of handwriting
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            valid_boxes = []
            for cnt in contours:
                cx, cy, cw, ch = cv2.boundingRect(cnt)
                # Ignore tiny noise dots less than 5x5 pixels
                if cw > 5 and ch > 5:
                    valid_boxes.append((cx, cy, cx+cw, cy+ch))
                    
            if valid_boxes:
                min_x = min(box[0] for box in valid_boxes)
                min_y = min(box[1] for box in valid_boxes)
                max_x = max(box[2] for box in valid_boxes)
                max_y = max(box[3] for box in valid_boxes)
                
                # Apply padding to make the cropped signature look natural
                pad = 8
                min_x = max(0, min_x - pad)
                min_y = max(0, min_y - pad)
                max_x = min(bw, max_x + pad)
                max_y = min(bh, max_y + pad)
                
                cropped_sig = sig_area[min_y:max_y, min_x:max_x]
                return encode_image_to_base64(cropped_sig)
                
        # Fallback: return the whole signature area if no contours found
        return encode_image_to_base64(sig_area)
    except Exception as e:
        print(f"Failed to extract signature: {e}")
        return ""

def parse_nid_text(text):
    """Parse raw OCR text using a highly robust scoring-based approach on sub-chunks."""
    chunks = text.split("---SUB-OCR---")
    
    candidates = {
        "name_bn": [],
        "name_en": [],
        "father_name": [],
        "mother_name": [],
        "dob": [],
        "nid_no": [],
        "blood_group": [],
        "address": [],
        "issue_date": [],
        "birth_place": []
    }
    
    # 1. Parse fields from each chunk
    for chunk in chunks:
        lines = chunk.split("\n")
        
        # --- Name (Bengali) ---
        for line in lines:
            m = re.search(r'(?:নাম|নম)\s*[:：\s|]+([^\n]+)', line)
            if m:
                candidates["name_bn"].append(clean_value(m.group(1)))
                
        # --- Name (English) ---
        for line in lines:
            m = re.search(r'Name\s*[:：\s|]+([^\n]+)', line, re.IGNORECASE)
            if m:
                candidates["name_en"].append(clean_value(m.group(1)))
                
        # --- Father's Name ---
        for line in lines:
            m = re.search(r'(?:পিতা|fre|fic|feta)\s*[:：\s|]+([^\n]+)', line)
            if m:
                candidates["father_name"].append(clean_value(m.group(1)))
                
        # --- Mother's Name ---
        for line in lines:
            m = re.search(r'(?:মাতা|মাতাঃ|মাতা|Wei|We|Wei:)\s*[:：\s|]+([^\n]+)', line)
            if m:
                candidates["mother_name"].append(clean_value(m.group(1)))
                
        # --- Date of Birth ---
        # Match standard DoB like 10 Feb 1967
        m_dob = re.findall(r'(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})', chunk, re.IGNORECASE)
        for d in m_dob:
            candidates["dob"].append(clean_value(d))
        # Match lines with Date of Birth
        for line in lines:
            if "birth" in line.lower() or "@ieth" in line.lower() or "dob" in line.lower():
                m = re.search(r'(?:Birth|@ieth|dob)\s*[:：\s|]+([^\n]+)', line, re.IGNORECASE)
                if m:
                    candidates["dob"].append(clean_value(m.group(1)))
                    
        # --- NID Number ---
        for line in lines:
            m = re.search(r'(?:ID\s*NO|IDNO|1080|1D\s*NO|ID)\s*[:：\s|]+(\d+)', line, re.IGNORECASE)
            if m:
                candidates["nid_no"].append(m.group(1))
        # Also find any sequence of 10, 13, or 17 digits in the chunk
        m_dig = re.findall(r'\b(\d{10}|\d{13}|\d{17})\b', chunk)
        for d in m_dig:
            candidates["nid_no"].append(d)
            
        # --- Blood Group ---
        for line in lines:
            m = re.search(r'(?:Blood\s+Group|Blood\s+Grovp|BloodGroup)\s*[:：\s|]+([^\n]+)', line, re.IGNORECASE)
            if m:
                candidates["blood_group"].append(clean_value(m.group(1)))
                
        # --- Address ---
        for line in lines:
            m = re.search(r'(?:ঠিকানা)\s*[:：\s|]+([^\n]+)', line)
            if m:
                candidates["address"].append(clean_value(m.group(1)))
                
        # --- Issue Date ---
        for line in lines:
            m = re.search(r'(?:প্রদানের\s+তারিখ)\s*[:：\s|]+([^\n]+)', line)
            if m:
                candidates["issue_date"].append(clean_value(m.group(1)))
                
        # --- Birth Place ---
        for line in lines:
            m = re.search(r'(?:জন্মস্থান|জন্মস্থানঃ)\s*[:：\s|]+([^\n]+)', line)
            if m:
                candidates["birth_place"].append(clean_value(m.group(1)))

    # 2. Select the best candidates based on high-quality constraints
    result = {
        "name_bn": "",
        "name_en": "",
        "father_name": "",
        "mother_name": "",
        "dob": "",
        "nid_no": "",
        "blood_group": "",
        "address": "",
        "issue_date": "",
        "birth_place": ""
    }
    
    # 2.1 Name Bangla: must have Bengali chars, length > 1, reject starting with 'র '
    bn_names = [c for c in candidates["name_bn"] if has_bengali(c) and len(c) > 1 and not c.startswith("র ")]
    result["name_bn"] = bn_names[0] if bn_names else ""
    
    # 2.2 Name English: must be English characters, length > 3, reject common noise words
    noise_words = {"government", "republic", "bangladesh", "national", "card", "date", "birth", "father", "mother", "idno", "signature"}
    en_names = []
    for c in candidates["name_en"]:
        if is_english_letters_only(c) and len(c) > 3:
            words = set(c.lower().split())
            if not words.intersection(noise_words):
                en_names.append(c)
    result["name_en"] = en_names[0] if en_names else ""
    
    # 2.3 Father's Name: must have Bengali characters, length > 1, reject starting with 'র '
    fathers = [c for c in candidates["father_name"] if has_bengali(c) and len(c) > 1 and not c.startswith("র ")]
    result["father_name"] = fathers[0] if fathers else ""
    
    # 2.4 Mother's Name: must have Bengali characters, length > 1, reject starting with 'র '
    mothers = [c for c in candidates["mother_name"] if has_bengali(c) and len(c) > 1 and not c.startswith("র ")]
    result["mother_name"] = mothers[0] if mothers else ""
    
    # 2.5 Date of Birth: prefer dd Mmm yyyy (like 10 Feb 1967)
    dobs_valid = [c for c in candidates["dob"] if re.match(r'^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$', c)]
    if dobs_valid:
        result["dob"] = dobs_valid[0]
    else:
        dobs_any = [c for c in candidates["dob"] if re.search(r'\d', c) and len(c) > 4]
        result["dob"] = dobs_any[0] if dobs_any else ""
        
    # 2.6 NID Number: prefer 10, 13, or 17 digits
    nids = [c for c in candidates["nid_no"] if len(c) in [10, 13, 17]]
    if nids:
        result["nid_no"] = nids[0]
    else:
        nids_any = [c for c in candidates["nid_no"] if len(c) > 5]
        result["nid_no"] = nids_any[0] if nids_any else ""
        
    # 2.7 Blood Group: must match A/B/AB/O with +/-
    bgs = []
    for c in candidates["blood_group"]:
        m = re.search(r'\b(A|B|AB|O)\s*[\+\-]\b', c, re.IGNORECASE)
        if m:
            bgs.append(m.group(0).upper())
    result["blood_group"] = bgs[0] if bgs else ""
    
    # 2.8 Address: must be Bengali and reasonable length
    addrs = [c for c in candidates["address"] if has_bengali(c) and len(c) > 5]
    result["address"] = addrs[0] if addrs else ""
    
    # 2.9 Issue Date: look for dd/mm/yyyy
    issues = []
    for c in candidates["issue_date"]:
        m = re.search(r'(\d{1,2}/\d{1,2}/\d{4})', c)
        if m:
            issues.append(m.group(1))
        elif re.search(r'\d', c):
            issues.append(c)
    result["issue_date"] = issues[0] if issues else ""
    
    # 2.10 Birth Place: must be Bengali
    bps = [c for c in candidates["birth_place"] if has_bengali(c) and len(c) > 1]
    result["birth_place"] = bps[0] if bps else ""
    
    return result

def process_nid_images(front_base64, back_base64=None):
    """Processes front and back NID images to extract all information and the signature."""
    front_img = decode_base64_image(front_base64)
    back_img = decode_base64_image(back_base64) if back_base64 else None
    
    if front_img is None:
        return {"error": "Failed to decode front image"}
        
    # Detect if single image contains both front and back side-by-side
    h, w, c = front_img.shape
    if back_img is None and w / h > 1.5:
        # Split image into front (left) and back (right) halves
        print("Single wide image detected. Splitting into front (left) and back (right) halves...")
        mid = w // 2
        back_img = front_img[:, mid:]
        front_img = front_img[:, :mid]
        
    # Extract text from front image (Name, Father, Mother, DoB, NID)
    print("Running OCR on NID Front side...")
    front_text = extract_text_with_fallback(front_img)
    front_data = parse_nid_text(front_text)
    
    # Extract text and signature from back image (Address, Blood Group, Issue Date, Signature)
    back_data = {}
    signature_base64 = ""
    if back_img is not None:
        print("Running OCR on NID Back side...")
        back_text = extract_text_with_fallback(back_img)
        back_data = parse_nid_text(back_text)
        
        print("Extracting holder signature from back side...")
        signature_base64 = extract_signature(back_img)
        
    # Merge extracted fields, prioritizing front_data for front fields and back_data for back fields
    merged_data = {
        "name_bn": front_data.get("name_bn") or back_data.get("name_bn") or "",
        "name_en": front_data.get("name_en") or back_data.get("name_en") or "",
        "father_name": front_data.get("father_name") or back_data.get("father_name") or "",
        "mother_name": front_data.get("mother_name") or back_data.get("mother_name") or "",
        "dob": front_data.get("dob") or back_data.get("dob") or "",
        "nid_no": front_data.get("nid_no") or back_data.get("nid_no") or "",
        "blood_group": back_data.get("blood_group") or front_data.get("blood_group") or "",
        "address": back_data.get("address") or front_data.get("address") or "",
        "issue_date": back_data.get("issue_date") or front_data.get("issue_date") or "",
        "birth_place": back_data.get("birth_place") or front_data.get("birth_place") or "",
        "signature": signature_base64
    }
    
    return merged_data
