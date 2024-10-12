from fastapi import FastAPI
import subprocess
import asyncio
import sys

app = FastAPI()


@app.post("/")
async def crawl():
    # Scrapy 크롤링 프로세스 시작
    process = subprocess.Popen(
        ["python", "crawl_oasis.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,  # stderr -> stdout *Redirect*
        text=True,
        bufsize=1,
        universal_newlines=True,
    )

    # 로그 비동기 출력
    async def stream_Oasis_logs():
        while True:
            line = process.stdout.readline()
            if line:
                print(f"[Oasis Crawl Log] {line.strip()}")
                sys.stdout.flush()  # 로그를 즉시 출력
            if not line and process.poll() is not None:
                break
            await asyncio.sleep(0)

    # 로그를 비동기적으로 처리
    await stream_Oasis_logs()

    # 프로세스 종료 대기
    process.wait()

    # 작업 완료 후 응답 반환
    response_ = {"status": "Crawling completed"}

    return response_
