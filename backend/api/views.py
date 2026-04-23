from rest_framework import viewsets, status, parsers
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Product, MockupJob, CustomizerConfig
from .serializers import ProductSerializer, MockupJobSerializer, CustomizerConfigSerializer
from engine.tasks import generate_mockup_task

class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Product.objects.filter(is_active=True).prefetch_related('images')
    serializer_class = ProductSerializer

class MockupJobViewSet(viewsets.ModelViewSet):
    queryset = MockupJob.objects.all()
    serializer_class = MockupJobSerializer
    http_method_names = ['get', 'post']

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        job = serializer.save()

        # Dispatch Celery Task
        # We pass IDs and strings instead of full objects to Celery
        task = generate_mockup_task.delay(
            job_id=str(job.id),
            product_image_id=str(job.product_image.id) if job.product_image else None
        )
        
        # Save the celery task ID to the DB job entry
        job.task_id = task.id
        job.save(update_fields=['task_id'])

        return Response(self.get_serializer(job).data, status=status.HTTP_201_CREATED)

class CustomizerConfigViewSet(viewsets.ModelViewSet):
    queryset = CustomizerConfig.objects.all()
    serializer_class = CustomizerConfigSerializer
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    http_method_names = ['get', 'post']
