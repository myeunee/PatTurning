import pika
import os
import json


class RabbitMQProducer:
    # 클래스 정의 시 RabbitMQ 인증 정보 가져오기
    def __init__(self, host, port, username, password, queue):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.queue = queue

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

        self.channel = self.connection.channel()  # 채널 생성
        self.channel.queue_declare(queue=self.queue, durable=True)

    def produce(self, data):

        # data가 리스트일 경우, 리스트의 각 딕셔너리를 개별적으로 전송
        if isinstance(data, list):
            for item in data:
                # item이 dict 형태인지 확인하고, JSON으로 변환하여 전송
                if isinstance(item, dict):
                    json_message = json.dumps(item).encode("utf-8")
                    try:
                        self.channel.basic_publish(
                            exchange="",
                            routing_key=self.queue,
                            body=json_message,
                            properties=pika.BasicProperties(delivery_mode=2),
                        )
                        print(f"Message sent: {json_message}")
                    except Exception as e:
                        print(f"Error sending message: {e}")
                else:
                    print("Skipping non-dictionary item in list.")
        else:
            # 단일 데이터를 JSON으로 직렬화하여 전송
            json_message = json.dumps(data).encode("utf-8")
            try:
                self.channel.basic_publish(
                    exchange="",
                    routing_key=self.queue,
                    body=json_message,
                    properties=pika.BasicProperties(delivery_mode=2),
                )
                print(f"Message sent: {json_message}")
            except Exception as e:
                print(f"Error sending message: {e}")

    def close(self):
        self.connection.close()
