import cv2
import numpy as np
from PIL import Image
import io
import requests

def fetch_image_from_url(url):
    response = requests.get(url)
    response.raise_for_status()
    image = Image.open(io.BytesIO(response.content)).convert('RGBA')
    return image

def apply_perspective_warp(design_image, target_quad, output_size):
    """
    Warp the design image to fit into the target_quad on the product.
    target_quad: list of 4 points [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
    output_size: (width, height) of the product image
    """
    design_w, design_h = design_image.size
    src_points = np.float32([[0, 0], [design_w, 0], [0, design_h], [design_w, design_h]])
    
    # Target points based on print area defined in DB
    dst_points = np.float32(target_quad)
    
    matrix = cv2.getPerspectiveTransform(src_points, dst_points)
    
    # Convert PIL to CV2
    design_cv = cv2.cvtColor(np.array(design_image), cv2.COLOR_RGBA2BGRA)
    
    # Warp
    warped_cv = cv2.warpPerspective(design_cv, matrix, output_size, flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    
    # Convert back to PIL
    warped_pil = Image.fromarray(cv2.cvtColor(warped_cv, cv2.COLOR_BGRA2RGBA))
    return warped_pil

def apply_displacement_and_blend(base_image, warped_design):
    """
    Extract luminance map, apply displacement on warped_design, and blend with multiply.
    """
    # For now, a simplified alpha compose/multiply blend placeholder.
    # Advanced displacement map needs a depth map. We extract L channel from base.
    base_gray = base_image.convert('L')
    
    # Convert to CV2 arrays for math
    base_arr = np.array(base_image)
    design_arr = np.array(warped_design)
    gray_arr = np.array(base_gray)
    
    # Apply soft blur for 'depth' map to shift pixels
    depth_map = cv2.GaussianBlur(gray_arr, (5, 5), 0)
    
    # Normalize depth map for blending (Multiply mode)
    # Multiply: Result = (Base * Design) / 255
    blend_arr = design_arr.copy()
    
    # Only blend where the design is opaque
    alpha_channel = design_arr[:, :, 3] / 255.0
    
    for c in range(3): # RGB channels
        # Multiply blend with the original luminance
        blend_arr[:, :, c] = np.clip((design_arr[:, :, c] / 255.0) * (base_arr[:, :, c] / 255.0) * 255.0, 0, 255)
    
    # Combine back using alpha blending
    result_img = np.copy(base_arr)
    for c in range(3):
        result_img[:, :, c] = (blend_arr[:, :, c] * alpha_channel + base_arr[:, :, c] * (1 - alpha_channel))
        
    return Image.fromarray(result_img)

def generate_mockup(base_url, design_url, print_area):
    """
    Main orchestration function:
    1. Fetch base image and design image.
    2. Warp design to the correct perspective defined by print_area.
    3. Apply displacement and blend.
    """
    base_image = fetch_image_from_url(base_url)
    design_image = fetch_image_from_url(design_url)
    
    width, height = base_image.size
    
    # Calculate target quad from print area
    # `print_area`: {"x": ..., "y": ..., "max_width": ..., "max_height": ...}
    px = print_area.get('x', 0)
    py = print_area.get('y', 0)
    pw = print_area.get('max_width', width)
    ph = print_area.get('max_height', height)
    
    # Assuming simple flat rectangular print area for now
    target_quad = [
        [px, py],
        [px + pw, py],
        [px, py + ph],
        [px + pw, py + ph]
    ]

    warped_design = apply_perspective_warp(design_image, target_quad, (width, height))
    final_mockup = apply_displacement_and_blend(base_image, warped_design)
    
    return final_mockup
