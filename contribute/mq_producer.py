import pika
import os
import json
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

class RabbitMQProducer:
    def __init__(self, host, port, username, password, queue):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.queue = queue

    def produce(self, data):
        credentials = pika.PlainCredentials(self.username, self.password)

        self.connection = pika.BlockingConnection(
            pika.ConnectionParameters(
                host=self.host,
                virtual_host="/",
                port=self.port,
                credentials=credentials,
            )
        )
        channel = self.connection.channel()
        channel.queue_declare(queue=self.queue, durable=True)

        # 리스트로 받은 data의 각 딕셔너리를 개별적으로 전송
        if isinstance(data, list):
            for item in data:
                # item이 dict 형태인지 확인하고, JSON으로 변환하여 전송
                if isinstance(item, dict):
                    json_message = json.dumps(item).encode("utf-8")
                    try:
                        channel.basic_publish(
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
                channel.basic_publish(
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
