import logging
import os

def setup_logging(log_dir, log_name):
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)

    logger = logging.getLogger()
    logger.setLevel(logging.DEBUG)

    # 파일 핸들러
    file_handler = logging.FileHandler(f"{log_dir}/{log_name}", mode='a')
    file_handler.setLevel(logging.INFO)

    # 스트림 핸들러
    stream_handler = logging.StreamHandler()
    stream_handler.setLevel(logging.INFO)

    # 포맷터 설정
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    file_handler.setFormatter(formatter)
    stream_handler.setFormatter(formatter)

    # 핸들러 추가
    logger.addHandler(file_handler)
    logger.addHandler(stream_handler)

    return logger
