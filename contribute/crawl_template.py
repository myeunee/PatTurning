''' 
mq_producer_template.py 파일에 RabbitMQProducer 클래스를 참고하시어 
크롤링 코드를 작성하시어 주십시오.

사용자 지정 큐는 {추후 링크 추가} 링크를 참고하시어 Issues로 요청하시어 주십시오.
'''
import os
from mq_producer_template import RabbitMQProducer

username = os.getenv('RABBITMQ_USERNAME', 'guest')  # RabbitMQ 사용자 이름 (기본값: guest)
password = os.getenv('RABBITMQ_PASSWORD', 'guest')  # RabbitMQ 비밀번호 (기본값: guest)
hostname = os.getenv('RABBITMQ_HOSTNAME', 'localhost')  # RabbitMQ 호스트 이름 (기본값: localhost)
port = os.getenv('RABBITMQ_PORT', '5672')          # RabbitMQ 포트 (기본값: 5672)
vhost = os.getenv('RABBITMQ_VHOST', '/')        # RabbitMQ 가상 호스트 (기본값: /)
queue = os.getenv('RABBITMQ_QUEUE', 'test.queue')  # 큐 이름 (기본값: test_queue)

def crawl():
    """
    return type: list[dict] or dict
    e.g. [{"category_name": cn1, "product_id": pid1, "price": p1},
          {"category_name": cn2, "product_id": pid2, "price": p2},
          ...]
    e.g. {"category_name": cn, "product_id": pid, "price": p}
    """
    data = {"category_name": "cn", "product_id": 123, "price": 12345}
    #              #
    # 크롤링 코드 작성 #
    #              #
    return data
    
if __name__ == "__main__":
    # 데이터 수집
    result = crawl()
    # RabbitMQ Producer 생성
    mq_producer = RabbitMQProducer(hostname, port, username, password, queue)
    # RabbitMQ producer에 데이터 전송
    mq_producer.produce(result)
    # RabbitMQ 연결 종료
    mq_producer.close()