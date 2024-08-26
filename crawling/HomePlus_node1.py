from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import time, os
import logging
from pymongo.errors import NotPrimaryError

class HomePlusCrawler:
    driver = None
    url = None
    chrome_options = None
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")

    def start_driver(self, category_id):
        cache_path = os.path.expanduser("~/.wdm/drivers")
        if os.path.exists(cache_path):
            os.system(f"rm -rf {cache_path}")
        self.driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=self.chrome_options)
        self.driver.set_window_size(1920, 1080)
        self.driver.set_script_timeout(99999999999)
        self.driver.set_page_load_timeout(99999999999)
        url = f'https://mfront.homeplus.co.kr/list?categoryDepth=1&categoryId={category_id}'
        self.driver.get(url)

    def scroll_to_bottom(self, category_id):
        last_height = self.driver.execute_script("return document.body.scrollHeight")
        cnt = 1

        while True:
            print(f"category_id({category_id})-{cnt}: to be continued...")
            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(1)
            
            new_height = self.driver.execute_script("return document.body.scrollHeight")
            if new_height == last_height:
                print(f"category_id({category_id})-{cnt} scrolling completed!!!")
                break
            last_height = new_height
            cnt += 1

    def category_parse(self, category_id):

        category_name = self.driver.find_element(
            By.XPATH, '//*[@id="site-wrapper"]/div[2]/div[2]/p'
        )
        if category_name:
            category_name = category_name.text
            logging.info(f"CATEGORY NAME: {category_name} crawling completed.")
        else:
            category_name = 'unknown'
            logging.info("[Exception] CATEGORY_NAME NOT FOUND.")
        return category_name

    def product_url_id_parse(self, category_id):
        product_urls = self.driver.find_elements(
            By.XPATH, '//*[@id="site-wrapper"]/div[2]/div[3]/div[2]/div[2]/div/div/div/div[2]/div[2]/a'
        )
        if product_urls:
            product_urls = ['https://mfront.homeplus.co.kr/' + url.get_attribute('href') for url in product_urls]
            product_ids = [''.join(filter(str.isdigit, url)) for url in product_urls]
            # logging.info(f"[{category_id}] PRODUCT URL: {product_urls[:3]} crawling completed.")
            logging.info(f"[{category_id}] PRODUCT ID: {product_ids[:3]} crawling completed.")
        else:
            product_ids = []
            # logging.info(f"[{category_id}] PRODUCT_URL NOT FOUND.")
            logging.info(f"[{category_id}] PRODUCT ID NOT FOUND.")
        return product_ids

    # def product_names_parse(self, category_id):
    #     product_names = self.driver.find_elements(By.XPATH, '//*[@id="site-wrapper"]/div[2]/div[3]/div[2]/div[2]/div/div/div/div[2]/div[2]/a/p')
    #     if product_names:
    #         product_names = [name.text for name in product_names]
    #         logging.info(f"[{category_id}] PRODUCT NAME: {product_names[:3]} crawling completed.")
    #     else:
    #         product_names = []
    #         logging.info(f"[{category_id}] PRODUCT NAME NOT FOUND.")
    #     return product_names

    def price_parse(self, category_id):
        prices = self.driver.find_elements(By.CSS_SELECTOR, 'div.price > strong.priceValue')
        if prices:
            prices = [int(price.text.replace(',', '')) for price in prices]
            logging.info(f"[{category_id}] PRICE: {prices[:3]} crawling completed.")
        else:
            prices = []
            logging.info(f"[{category_id}] PRICE NOT FOUND.")
        return prices

    def crawl(self):
        for category_id in range(100001, 100078):
        # for category_id in range(100077, 100078):
            try:
                logging.info("======================================================================")
                logging.info(f"Started loading categoryId[{category_id}]...")
                
                self.start_driver(category_id)
                self.scroll_to_bottom(category_id)
                logging.info(f"Started Crawling categoryId[{category_id}]...")
                category_name = self.category_parse(category_id)
                product_id = self.product_url_id_parse(category_id)
                # product_name = self.product_names_parse(category_id)
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


