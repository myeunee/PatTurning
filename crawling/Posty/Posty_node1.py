from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import time
import logging

class PostyCrawler:
    driver = None
    url = None
    chrome_options = None
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--disable-software-rasterizer")
    chrome_options.add_argument("--disable-extensions")
    chrome_options.add_argument("--disable-backgrounding-occluded-windows")


    chrome_options.page_load_strategy = 'eager'  # 빠른 로딩


    def start_driver(self, category_url):
        self.driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=self.chrome_options)
        self.driver.set_window_size(1920, 1080)
        self.driver.set_script_timeout(99999999999)
        self.driver.set_page_load_timeout(99999999999)
        self.driver.get(category_url)

    def scroll_to_bottom(self, category_id):
        last_height = self.driver.execute_script("return document.body.scrollHeight")
        cnt, element_count = 1, 0

        try:
            while True:
                logging.info(f"category_id({category_id})-{cnt}: to be continued...")
                self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(3)
                
                new_element_count = len(self.driver.find_elements(By.XPATH, '//*[@id="__next"]/div/div[4]/ul/li'))
                if new_element_count == element_count:
                    break
                element_count = new_element_count
                logging.info(f"From now on {element_count * 2} elements found.")
                
                new_height = self.driver.execute_script("return document.body.scrollHeight")
                if new_height == last_height:
                    logging.info(f"category_id({category_id})-{cnt} scrolling completed!!!")
                    break
                last_height = new_height
                cnt += 1
        except Exception as E:
            logging.info("┌───────────────────────────────────────────────────┐")
            logging.info("│                 Error Occured!!!                  │")
            logging.info(f"{E}")
            logging.info("└───────────────────────────────────────────────────┘")
            
    def product_url_id_parse(self, category_id):
        product_urls = self.driver.find_elements(
            By.XPATH, '//*[@id="__next"]/div/div[4]/ul/li/a'
        )
        product_urls = [url.get_attribute('href') for url in product_urls]
        # print("product_urls", product_urls)
        if product_urls:
            product_ids = [''.join(filter(str.isdigit, url)) for url in product_urls]
            logging.info(f"[{category_id}] PRODUCT ID: {product_ids[:3]} crawling completed.")
        else:
            product_ids = []
            # logging.info(f"[{category_id}] PRODUCT_URL NOT FOUND.")
            logging.info(f"[{category_id}] PRODUCT ID NOT FOUND.")
        return product_ids

    def price_parse(self, category_id):
        prices = self.driver.find_elements(By.CLASS_NAME, 'ProductCard_price__iMUwi')
        if prices:
            prices = [int(price.text.replace(',', '')) for price in prices]
            logging.info(f"[{category_id}] PRICE: {prices[:3]} crawling completed.")
        else:
            prices = []
            logging.info(f"[{category_id}] PRICE NOT FOUND.")
        return prices

    def crawl(self):
        categories = [
            ('https://posty.kr/categories/2864', "여성의류"),
            ('https://posty.kr/categories/2946', "남성의류"),
            ('https://posty.kr/categories/959', "골프"),
            ('https://posty.kr/categories/3053', "슈즈/잡화"),
            ('https://posty.kr/categories/1920', "스포츠"),
            ('https://posty.kr/categories/984', "아웃도어"),
            ('https://posty.kr/categories/2637', "빅사이즈"),
            ('https://posty.kr/categories/1973', "뷰티"),
            ('https://posty.kr/categories/2093', "명품"),
            ('https://posty.kr/categories/1080', "언더웨어"),
        ]
        # for category_id in range(100077, 100078):
        for category_url, category_name in categories:
            try:
                category_id = int(''.join(filter(str.isdigit, category_url)))
                logging.info("======================================================================")
                logging.info(f"Started loading categoryId[{category_id}]-{category_name}...")
                
                self.start_driver(category_url)
                self.scroll_to_bottom(category_id)
                logging.info(f"Started Crawling categoryId[{category_id}]-{category_name}...")
                
                product_id = self.product_url_id_parse(category_id)
                price = self.price_parse(category_id)
                logging.info(f"Crawling CategoryId[{category_id}] Completed.")
                logging.info("======================================================================")
                self.driver.quit()
                yield category_id, category_name, product_id, price
            except Exception as E:
                logging.info("┌───────────────────────────────────────────────────┐")
                logging.info("│                 Error Occured!!!                  │")
                logging.info(f"{E}")
                logging.info("└───────────────────────────────────────────────────┘")


