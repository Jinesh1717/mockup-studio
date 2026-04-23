from django.db import models
import uuid

class Product(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class ProductImage(models.Model):
    class ViewType(models.TextChoices):
        FRONT = 'FRONT', 'Front'
        BACK = 'BACK', 'Back'
        SIDE = 'SIDE', 'Side'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, related_name='images', on_delete=models.CASCADE)
    view_type = models.CharField(max_length=10, choices=ViewType.choices, default=ViewType.FRONT)
    image_url = models.URLField(max_length=1024, help_text="S3 or Firebase URL of the base product image")
    
    # Store JSON coordinates defining print area
    # Example: {"x": 100, "y": 150, "max_width": 200, "max_height": 300, "tilt_angle": 0}
    print_area = models.JSONField(default=dict)

    def __str__(self):
        return f"{self.product.name} - {self.get_view_type_display()}"


class MockupJob(models.Model):
    class JobStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        PROCESSING = 'PROCESSING', 'Processing'
        COMPLETED = 'COMPLETED', 'Completed'
        FAILED = 'FAILED', 'Failed'
        
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task_id = models.CharField(max_length=255, blank=True, null=True, help_text="Celery Task ID")
    product_image = models.ForeignKey(ProductImage, on_delete=models.CASCADE, null=True, blank=True)
    user_design = models.ImageField(upload_to='designs/', help_text="Uploaded user design", null=True)
    result_image_url = models.URLField(max_length=1024, blank=True, null=True, help_text="URL of generated mockup")
    status = models.CharField(max_length=20, choices=JobStatus.choices, default=JobStatus.PENDING)
    error_message = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Job {self.id} - {self.status}"

class CustomizerConfig(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product_name = models.CharField(max_length=255)
    color = models.CharField(max_length=50)
    design_image = models.ImageField(upload_to='customizer/designs/', help_text="Uploaded 2D design decal")
    preview_snapshot = models.ImageField(upload_to='customizer/snapshots/', null=True, blank=True, help_text="3D snapshot image")
    decal_position = models.JSONField(default=dict)
    decal_rotation = models.JSONField(default=dict)
    decal_scale = models.JSONField(default=dict)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.product_name} - {self.color} - {self.id}"
