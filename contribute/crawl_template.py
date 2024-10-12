''' 
mq_producer_template.py 파일에 RabbitMQProducer 클래스를 참고하시어 
크롤링 코드를 작성하시어 주십시오.

사용자 지정 큐는 {추후 링크 추가} 링크를 참고하시어 Issues로 요청하시어 주십시오.
'''
import os
from mq_producer_template import RabbitMQProducer

username = os.getenv('RABBITMQ_USERNAME')
password = os.getenv('RABBITMQ_PASSWORD')
hostname = os.getenv('RABBITMQ_HOSTNAME')
port = os.getenv('RABBITMQ_PORT')

def crawl():
    """
    return type: list[dict] or dict
    e.g. [{"category_name": cn1, "product_id": pid1, "price": p1},
          {"category_name": cn2, "product_id": pid2, "price": p2},
          ...]
    e.g. {"category_name": cn, "product_id": pid, "price": p}
    """
    #              #
    # 크롤링 코드 작성 #
    #              #
    return data
    
if __name__ == "__main__":
    queue = f"user_defined_queue"
    producer = RabbitMQProducer(hostname, port, username, password, queue)
    producer.produce(data) # data type: list[dict] or dict