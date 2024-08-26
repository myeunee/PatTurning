import sys
from get_base_urls import get_base_urls
from get_categories import *
from db_info import *


def divide_base_urls(base_urls, n_pods):
    """
    base_urls 리스트를 n_pods 개의 document로 나누는 함수
    """
    chunk_size = len(base_urls) // n_pods
    divided_urls = [
        base_urls[i * chunk_size : (i + 1) * chunk_size] for i in range(n_pods)
    ]

    # 나머지를 마지막 document에 추가
    remainder = base_urls[n_pods * chunk_size :]
    if remainder:
        divided_urls[-1].extend(remainder)

    return divided_urls


if __name__ == "__main__":
    # 인자를 통해 n_pods 값을 받음
    n_pods = int(sys.argv[1])  # 기본값 10

    categories = get_categories()
    base_urls = get_base_urls(categories)

    # base_urls를 n_pods 개의 document로 나눔
    divided_urls = divide_base_urls(base_urls, n_pods)

    print(divided_urls)

    # MongoDB로 전송
    db = client["Crawl"]
    collection = db["Gmarket_info_for_crawl"]

    collection.delete_many({})

    documents = [
        {
            "pod_id": i + 1,  # pod_id는 1부터 시작
            "urls": [
                {
                    "category_id": item[0],
                    "category_name": item[1],
                    "detail_category_id": item[2],
                }
                for item in divided_urls[i]
            ],
        }
        for i in range(len(divided_urls))
    ]

    # MongoDB 컬렉션에 문서들 삽입
    collection.insert_many(documents)
