from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, MockupJobViewSet, CustomizerConfigViewSet

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'mockups', MockupJobViewSet, basename='mockup')
router.register(r'customizer', CustomizerConfigViewSet, basename='customizer')

urlpatterns = [
    path('', include(router.urls)),
]
