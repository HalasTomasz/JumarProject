from rest_framework.pagination import PageNumberPagination


class OrderPagePagination(PageNumberPagination):
    page_size = 15
    page_size_query_param = "page_size"
    max_page_size = 200


class ReportPagePagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100
