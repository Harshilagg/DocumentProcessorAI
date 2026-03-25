import cv2
import numpy as np

def create_4k_test_image(output_path):
    # Create a 4k white background (typical high-res passport scan)
    # 4k is 3840 x 2160 pixels
    img = np.ones((2160, 3840, 3), dtype=np.uint8) * 255
    
    # Add text
    font = cv2.FONT_HERSHEY_SIMPLEX
    test_text = "PASSPORT OFFICE - REPUBLIC OF TEST"
    cv2.putText(img, test_text, (500, 300), font, 3, (0, 0, 0), 5, cv2.LINE_AA)
    
    cv2.putText(img, "HOLDER NAME: JOHN DOE", (500, 600), font, 3, (0, 0, 0), 5, cv2.LINE_AA)
    cv2.putText(img, "DOCUMENT NUMBER: Z123456789", (500, 900), font, 3, (0, 0, 0), 5, cv2.LINE_AA)
    
    # Add a lot of random content to simulate a full document
    for i in range(10):
        cv2.putText(img, f"RANDOM LINE OF TEXT FOR OCR VALIDATION {i} - SPEED TEST", (500, 1200 + i*100), font, 2, (0, 0, 0), 3, cv2.LINE_AA)
        
    # Save the image
    cv2.imwrite(output_path, img)
    print(f"4k Test image created at {output_path}")

if __name__ == "__main__":
    create_4k_test_image("test_4k.png")
