from airflow import DAG
from airflow.decorators import task
from dotenv import load_dotenv
import os
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator, get_current_context
from airflow.exceptions import AirflowSkipException
from airflow.operators.python import get_current_context
from airflow.operators.email import EmailOperator
from airflow.operators.empty import EmptyOperator
from datetime import datetime, timedelta
import json, requests


# 함수 정의: HTTP POST 요청
def send_post_request(categoryId):
    load_dotenv()
    url = os.getenv("HOMEPLUS_SERVICE_URL")
    headers = {"Content-Type": "application/json"}
    data = json.dumps({"category_id": categoryId})

    response = requests.post(url, headers=headers, data=data)

    # 응답 코드와 내용을 로그로 남김
    if response.status_code == 200:
        print(f"Success: {response.json()}")
    elif "500 Internal Server Error" in response.text:
        context = get_current_context()
        print(
            f"Failed: {response.status_code}, NO PRODUCT EXISTS, detail shows below\n{response.text}"
        )
        raise AirflowSkipException(f"Skip task {context['ti'].task_id}")
    else:
        print(f"Failed: {response.status_code}, {response.text}")
        response.raise_for_status()
        


# DAG의 기본 설정
default_args = {
    "owner": "khuda",  # DAG 소유자
    "depends_on_past": False,  # 이전 DAG 실패 여부에 의존하지 않음
    # 'email': ['dbgpwl34@gmail.com'],    # 수신자 이메일
    #    "email_on_success": True,           # 성공 시 이메일 전송
    # 'email_on_failure': True,           # 실패 시 이메일 전송
    # 'email_on_retry': True,             # 재시도 시 이메일 전송
    "retries": 1,  # 실패 시 재시도 횟수
    "retry_delay": timedelta(minutes=5),  # 재시도 간격
}

# DAG 정의
with DAG(
    "HomePlus_Crawling_DAG",  # DAG의 이름
    default_args=default_args,  # 기본 인자 설정
    description="HomePlus Crawling",  # DAG 설명
    # schedule_interval='0 9,16,22 * * *',       # 실행 주기 (매일 09:00, 16:00, 22:00 정각)
    schedule_interval="0 * * * *",
    start_date=datetime(2024, 9, 20),  # 시작 날짜
    catchup=False,  # 시작 날짜부터 현재까지의 미실행 작업 실행 여부
) as dag:


    @task
    def send_post_request_HOMEPLUS_task(category_id):
        return send_post_request(category_id)

    # TaskFlow API로 task 정의
    @task
    def generate_queue_values():
        return [
            {"consumer": "HomePlus.product.queue"},
            {"consumer": "HomePlus.product.queue"},
            {"consumer": "HomePlus.product.queue"},
        ]

    # BashOperator에서 expand로 받은 값을 사용
    run_consumer_task = BashOperator.partial(
        task_id="run-consumer-task",
        bash_command="python3 /home/patturning1/HomePlus_consumer.py {{ params.consumer }}",  # 템플릿을 사용하여 매핑된 값 사용
    ).expand(params=generate_queue_values())

    category_ids = list(range(100001, 100078))

    # 모든 태스크의 실행 상태를 집계하여 이메일을 보낼 내용 생성
    def collect_task_results(**context):
        # 모든 태스크의 실행 상태 수집
        dag_run = context['dag_run']
        task_states = {}
        for task_instance in dag_run.get_task_instances():
            task_states[task_instance.task_id] = task_instance.current_state()

        # 이메일 내용을 상태에 따라 설정
        if any(state in ['failed', 'skipped'] for state in task_states.values()):
            email_subject = "Task Failure Alert"
            email_body = f"""
            <h3>One or more tasks have failed or been skipped!</h3>
            <p>Task States:</p>
            <pre>{task_states}</pre>
            """
        else:
            email_subject = "Task Success Alert"
            email_body = f"""
            <h3>All tasks have completed successfully!</h3>
            <p>Task States:</p>
            <pre>{task_states}</pre>
            """
    
            # 결과를 XCom에 저장
            context['ti'].xcom_push(key='email_subject', value=email_subject)
            context['ti'].xcom_push(key='email_body', value=email_body)

    # 파이썬 함수를 실행하는 태스크 정의
    collect_task_results_task = PythonOperator(
        task_id="collect_task_results",
        python_callable=collect_task_results,
        provide_context=True,
        trigger_rule="all_done",  # 모든 태스크가 완료된 후 실행
    )


    # 상태에 따라 이메일 전송
    send_summary_email = EmailOperator(
        task_id="send_summary_email",
        to="patturning@gmail.com",
        subject="{{ task_instance.xcom_pull(task_ids='collect_task_results', key='email_subject') }}",
        html_content="{{ task_instance.xcom_pull(task_ids='collect_task_results', key='email_body') }}",
        trigger_rule="all_done",  # 모든 태스크가 완료된 후 실행
    )

    [
        run_consumer_task,
        send_post_request_HOMEPLUS_task.expand(category_id=category_ids),
    ] >> collect_task_results_task >> send_summary_email
