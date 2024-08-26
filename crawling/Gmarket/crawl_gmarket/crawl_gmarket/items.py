import scrapy


class ProductItem(scrapy.Item):
    # 기존 필드들
    date = scrapy.Field()
    product_id = scrapy.Field()
    reg_price = scrapy.Field()
    sale_price = scrapy.Field()
    # image_url = scrapy.Field()
    # product_url = scrapy.Field()
    # product_name = scrapy.Field()

    # 새 필드들 추가
    category_id = scrapy.Field()
    category_name = scrapy.Field()
    detail_category_id = scrapy.Field()


# class ProductItem(scrapy.Item):
#     product_id = scrapy.Field()
#     product_name = scrapy.Field()
#     reg_price = scrapy.Field()
#     sale_price = scrapy.Field()
#     product_url = scrapy.Field()
#     image_url = scrapy.Field()
#     date = scrapy.Field()


# class SubSubCategoryItem(scrapy.Item):
#     subsubcategory_name = scrapy.Field()
#     subsubcategory_id = scrapy.Field()
#     products = scrapy.Field()


# class SubCategoryItem(scrapy.Item):
#     subcategory_name = scrapy.Field()
#     subsubcategories = scrapy.Field()


# class CategoryItem(scrapy.Item):
#     category_name = scrapy.Field()
#     subcategories = scrapy.Field()


# class GmarketItem(scrapy.Item):
#     platform = scrapy.Field()
#     categories = scrapy.Field()
