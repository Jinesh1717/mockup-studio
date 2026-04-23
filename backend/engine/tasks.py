from celery import shared_task
from api.models import MockupJob, ProductImage
from .mockup_engine import generate_mockup
import io
import uuid

@shared_task
def generate_mockup_task(job_id, product_image_id):
    try:
        job = MockupJob.objects.get(id=job_id)
        job.status = MockupJob.JobStatus.PROCESSING
        job.save(update_fields=['status'])

        # For Dummy Testing: If there is no real product_image, we skip the mockup generation entirely and just return the design logic
        if not product_image_id:
            import shutil, os
            from django.conf import settings
            file_name = f'mockup_{uuid.uuid4()}.png'
            file_path = os.path.join(settings.MEDIA_ROOT, file_name)
            os.makedirs(settings.MEDIA_ROOT, exist_ok=True)
            shutil.copy2(job.user_design.path, file_path)
            
            job.status = MockupJob.JobStatus.COMPLETED
            job.result_image_url = f'{settings.MEDIA_URL}{file_name}'
            job.save(update_fields=['status', 'result_image_url'])
            return
            
        product_image = ProductImage.objects.get(id=product_image_id)
        
        # Actual opencv processing code assumes base_url is accessible.
        result_img = generate_mockup(
            base_url=product_image.image_url,
            design_url=f"file://{job.user_design.path}",
            print_area=product_image.print_area
        )
        
        # Save to BytesIO
        output_io = io.BytesIO()
        result_img.save(output_io, format='PNG')
        output_io.seek(0)
        
        # ----- Firebase Storage Upload Placeholder ----- #
        # import firebase_admin
        # from firebase_admin import storage
        # bucket = storage.bucket()
        # blob = bucket.blob(f'mockups/{uuid.uuid4()}.png')
        # blob.upload_from_string(output_io.getvalue(), content_type='image/png')
        # blob.make_public()
        # result_url = blob.public_url
        
        # For development without firebase credentials right now:
        # We will just write it to local media root and construct URL
        import os
        from django.conf import settings
        file_name = f'mockup_{uuid.uuid4()}.png'
        file_path = os.path.join(settings.MEDIA_ROOT, file_name)
        os.makedirs(settings.MEDIA_ROOT, exist_ok=True)
        
        with open(file_path, 'wb') as f:
            f.write(output_io.getvalue())
            
        result_url = f'{settings.MEDIA_URL}{file_name}'
        
        # Complete Job
        job.status = MockupJob.JobStatus.COMPLETED
        job.result_image_url = result_url
        job.save(update_fields=['status', 'result_image_url'])
        
    except Exception as e:
        job = MockupJob.objects.get(id=job_id)
        job.status = MockupJob.JobStatus.FAILED
        job.error_message = str(e)
        job.save(update_fields=['status', 'error_message'])
