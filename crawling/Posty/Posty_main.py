from Posty_node1 import *
from PostyItem import *
from logger import *

TODAY = datetime.datetime.now().strftime("%y%m%d")

LOG_DIR = "posty_logs"
LOG_FILENAME = f"posty_{TODAY}.log"
OUTPUT_DIR = 'posty_data'
OUTPUT_FILENAME = f"posty_entire.json"

def process_next(generator):
    try: 
        logging.info(f"Started Generator Processing...")
        category_id, category_name, product_id, price = next(generator)
        # print(category_id)
        # print(price)
        logging.info(f"CategoryName[{category_name}] crawling Result \n product_id({len(product_id)}), price({len(price)})")
        logging.info(f"Started Saving CategoryName[{category_name}]...")
        items = PostyItems(category_id, category_name, product_id, price)
        # dic = items.to_dict()
        # print(f"dic: \n{dic}")
        # items.save_json(OUTPUT_DIR, OUTPUT_FILENAME)
        items.save_to_mongo()
        return True
    except StopIteration:
        logging.info("All Completed Generator Data.")
        return False

if __name__ == "__main__":
    start_time = time.time()
    logger = setup_logging(LOG_DIR, LOG_FILENAME)
    logging.info("STARTEDD CRAWL POSTY PRODUCT DATA")

    crawler = PostyCrawler()
    generator = crawler.crawl()
    while process_next(generator):
        pass

    end_time = time.time()
    time_spent = end_time - start_time
    time_spent_list = str(datetime.timedelta(seconds=time_spent))

    logging.info(f"Total {time_spent_list.split('.')[0]}")
    