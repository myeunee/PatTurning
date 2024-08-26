# 분류 단계별 계층화를 위해 구성된 Item 객체들


class GmarketItem:
    def __init__(self, categories=None):
        self.categories = categories if categories is not None else []

    def to_dict(self):
        return {
            "platform": "gmarket",
            "categories": [category.to_dict() for category in self.categories],
        }


class CategoryItem:
    def __init__(self, category_name, subcategories=None):
        self.category_name = category_name
        self.subcategories = subcategories if subcategories is not None else []

    def to_dict(self):
        return {
            "category_name": self.category_name,
            "subcategories": [
                subcategory.to_dict() for subcategory in self.subcategories
            ],
        }


class SubCategoryItem:
    def __init__(self, subcategory_name, subsubcategories=None):
        self.subcategory_name = subcategory_name
        self.subsubcategories = subsubcategories if subsubcategories is not None else []

    def to_dict(self):
        return {
            "subcategory_name": self.subcategory_name,
            "subsubcategories": [
                subsubcategory.to_dict() for subsubcategory in self.subsubcategories
            ],
        }


class SubSubCategoryItem:
    def __init__(self, subsubcategory_name, subsubcategory_id, url):
        self.subsubcategory_name = subsubcategory_name
        self.subsubcategory_id = subsubcategory_id
        self.url = url

    def to_dict(self):
        return {
            "subsubcategory_name": self.subsubcategory_name,
            "subsubcategory_id": self.subsubcategory_id,
            "url": self.url,
        }


# class ProductItem:
#     def __init__(self, product_id, product_name, price, url, date):
#         self.product_id = product_id
#         self.product_name = product_name
#         self.price = price
#         self.url = url
#         self.date = date

#     def to_dict():
#         return {
#             "product_id": self.product_id,
#             "product_name": self.product_name,
#             "price": self.price,
#             "url": self.url,
#             "date": self.date,
#         }
