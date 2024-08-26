import scrapy


class ProductItem(scrapy.Item):
    # 기존 필드들
    date = scrapy.Field()
    product_id = scrapy.Field()
    reg_price = scrapy.Field()
    sale_price = scrapy.Field()
    category_id = scrapy.Field()
    category_name = scrapy.Field()
    detail_category_id = scrapy.Field()
