import pika
import json
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

class RabbitMQProducer:
    def __init__(self, host, port, username, password, queue):
        """
        RabbitMQProducer 클래스의 생성자.
        
        :param host: RabbitMQ 서버의 호스트 이름 또는 IP 주소
        :param port: RabbitMQ 서버의 포트 번호
        :param username: RabbitMQ 서버에 접속하기 위한 사용자 이름
        :param password: RabbitMQ 서버에 접속하기 위한 비밀번호
        :param queue: 메시지를 전송할 큐의 이름
        """
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.queue = queue

    def produce(self, data):
        """
        데이터를 RabbitMQ 큐에 전송하는 함수.
        
        :param data: 전송할 데이터. 딕셔너리 또는 딕셔너리의 리스트 형태여야 함.
        :return: None
        """
        # RabbitMQ 서버에 연결하기 위한 인증 정보 설정
        credentials = pika.PlainCredentials(self.username, self.password)

        # RabbitMQ 서버에 연결 설정
        self.connection = pika.BlockingConnection(
            pika.ConnectionParameters(
                host=self.host,
                virtual_host="/",
                port=self.port,
                credentials=credentials,
            )
        )
        channel = self.connection.channel()  # 채널 생성
        channel.queue_declare(queue=self.queue, durable=True)

        # 데이터가 리스트 형태인지 확인
        if isinstance(data, list):
            for item in data:
                # 리스트의 각 항목이 딕셔너리인지 확인
                if isinstance(item, dict):
                    # 딕셔너리를 JSON 형식으로 직렬화
                    json_message = json.dumps(item).encode("utf-8")
                    try:
                        # 메시지를 큐에 전송
                        channel.basic_publish(
                            exchange="",
                            routing_key=self.queue,
                            body=json_message,
                            properties=pika.BasicProperties(delivery_mode=2),
                        )
                        logging.info(f"Message sent: {json_message}")
                    except Exception as e:
                        logging.info(f"Error sending message: {e}")
                else:
                    logging.info("Skipping non-dictionary item in list.")  # 리스트의 비딕셔너리 항목 건너뜀
        else:
            # 단일 데이터의 경우 JSON 형식으로 직렬화
            json_message = json.dumps(data).encode("utf-8")
            try:
                # 메시지를 큐에 전송
                channel.basic_publish(
                    exchange="",
                    routing_key=self.queue,
                    body=json_message,
                    properties=pika.BasicProperties(delivery_mode=2),
                )
                logging.info(f"Message sent: {json_message}")
            except Exception as e:
                logging.info(f"Error sending message: {e}")

    def close(self):
        """
        RabbitMQ 서버와의 연결을 종료하는 함수.
        
        :return: None
        """
        # RabbitMQ 연결 종료
        self.connection.close()
