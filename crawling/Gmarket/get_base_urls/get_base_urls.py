import aiohttp
import asyncio
import re
from lxml import html
import json
import gzip


async def fetch(session, url):
    async with session.get(url) as response:
        return await response.text()


async def parse_page(session, url, subsubcategory_name, subsubcategory_id):
    page_content = await fetch(session, url)
    tree = html.fromstring(page_content)

    menus = tree.cssselect("ul.mid-cate li a:first-of-type")

    results = []
    for element in menus:
        url_string = element.get("href")
        match = re.search(r"'(http[s]?://[^']+)'", url_string)
        if match:
            detail_url = match.group(1)
            # URL 변환 (/n/이 있어야 탐색이 됨.)
            if "browse.gmarket.co.kr/list" in detail_url:
                detail_url = detail_url.replace(
                    "browse.gmarket.co.kr/list",
                    "www.gmarket.co.kr/n/list",
                )
            if "http://" in detail_url:
                detail_url = detail_url.replace("http://", "https://")

            # detail_category_id 추출
            detail_category_id_match = re.search(r"category=(\d+)", detail_url)
            if detail_category_id_match:
                detail_category_id = detail_category_id_match.group(1)
                results.append(
                    [subsubcategory_id, subsubcategory_name, detail_category_id]
                )

    return results


async def parse(session, subsubcategory):
    url = subsubcategory["url"]
    subsubcategory_name = subsubcategory["subsubcategory_name"]
    subsubcategory_id = subsubcategory["subsubcategory_id"]

    results = await parse_page(session, url, subsubcategory_name, subsubcategory_id)
    return results


async def main(data):
    results = []
    async with aiohttp.ClientSession() as session:
        tasks = []
        for category in data["categories"]:
            for subcategory in category["subcategories"]:
                for subsubcategory in subcategory["subsubcategories"]:
                    task = asyncio.create_task(parse(session, subsubcategory))
                    tasks.append(task)

        all_results = await asyncio.gather(*tasks)
        for result in all_results:
            results.extend(result)
    return results

    # ([category_id, category_name, detail_category_id], ... ) 형식으로 변수 저장.
    # https://www.gmarket.co.kr/n/list?category={detail_category_id} 로 활용하여 다음 크롤링


def get_base_urls(data):
    return asyncio.run(main(data))
