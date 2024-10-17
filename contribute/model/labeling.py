from bs4 import BeautifulSoup as bs
import os
import re
import csv

from regexs_by_site import *


def labeling_by_html(site_name, file_name, labels):

    # HTML의 텍스트들만 집합으로 정리
    with open(f"htmls/{site_name}/{file_name}.html", "r", encoding="utf-8") as f:
        idx = f.read()
        s = bs(idx, "lxml")

    strs = set()

    for line in s.text.split("\n"):
        if line.strip():
            strs.add(line.strip())

    # 해당 사이트의 다크패턴 정규표현식을 통해 처리
    output = {}

    for string in strs:
        matched = False
        for label, patterns in labels.items():
            for p in patterns:
                reg_p = re.compile(rf"{p}")
                if reg_p.search(string):
                    output[string] = label
                    matched = True
                    break
            if matched:
                break
        if not matched:
            output[string] = 5

    # CSV 파일로 저장
    with open(f"labels/{file_name}.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["text", "label"])
        for k, v in output.items():
            writer.writerow([k, v])
        print(f"============ Save {file_name}.csv ============")


def main():
    base_path = "htmls"

    # htmls 디렉토리 내 존재하는 사이트 디렉토리들
    sites = [
        d for d in os.listdir(base_path) if os.path.isdir(os.path.join(base_path, d))
    ]

    # 각 사이트
    for site in sites:
        site_path = os.path.join(base_path, site)
        # 각 사이트 내에 존재하는 html 파일들
        html_files = [f for f in os.listdir(site_path) if f.endswith(".html")]

        # 각각의 html 파일별로 라벨링 작업 처리
        for html_file in html_files:
            labeling_by_html(site, html_file[:-5], site_darkpatterns[site])


if __name__ == "__main__":
    main()
