from rest_framework import serializers
from .models import Product, ProductImage, MockupJob, CustomizerConfig

class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'view_type', 'image_url', 'print_area']

class ProductSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'images']

class MockupJobSerializer(serializers.ModelSerializer):
    product_image = serializers.PrimaryKeyRelatedField(queryset=ProductImage.objects.all(), required=False, allow_null=True)
    class Meta:
        model = MockupJob
        fields = ['id', 'task_id', 'product_image', 'user_design', 'result_image_url', 'status', 'error_message']
        read_only_fields = ['task_id', 'result_image_url', 'status', 'error_message']

class CustomizerConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomizerConfig
        fields = '__all__'
        read_only_fields = ['id', 'created_at']
