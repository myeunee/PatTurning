from airflow.operators.python import PythonOperator, get_current_context
from airflow.exceptions import AirflowSkipException
from airflow import DAG
from airflow.decorators import task
from dotenv import load_dotenv
import os
from airflow.operators.bash import BashOperator
from airflow.operators.email import EmailOperator
from datetime import datetime, timedelta
import json, requests

# HTTP POST 요청 함수
def send_post_request(categoryId):
    load_dotenv()
    url = os.getenv("HOMEPLUS_SERVICE_URL")
    headers = {"Content-Type": "application/json"}
    data = json.dumps({"category_id": categoryId})
    response = requests.post(url, headers=headers, data=data)

    if response.status_code == 200:
        print(f"Success: {response.json()}")
    elif "500 Internal Server Error" in response.text:
        context = get_current_context()
        raise AirflowSkipException(f"Skip task {context['ti'].task_id}")
    else:
        response.raise_for_status()

# DAG 기본 설정
default_args = {
    "owner": "khuda",
    "depends_on_past": False,
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
}

# DAG 정의
with DAG(
    "HomePlus_Crawling_DAG",
    default_args=default_args,
    description="HomePlus Crawling",
    schedule_interval="0 * * * *",
    start_date=datetime(2024, 9, 20),
    catchup=False,
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
        bash_command="python3 /home/patturning1/HomePlus_consumer.py {{ params.consumer }}",
    ).expand(params=generate_queue_values())

    category_ids = list(range(100001, 100078))

    # 모든 태스크의 상태를 수집하여 결과를 XCom에 저장하는 함수
    def collect_task_results(**context):
        task_instances = context['dag_run'].get_task_instances()
        task_states = {task_instance.task_id: task_instance.state for task_instance in task_instances}

        # 실패한 태스크가 있는지 확인
        if any(state == 'failed' for state in task_states.values()):
            email_subject = "Task Failure Alert"
            email_body = f"""
            <h3>One or more tasks have failed!</h3>
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

    # 모든 태스크가 완료된 후 상태를 수집
    collect_task_results_task = PythonOperator(
        task_id="collect_task_results",
        python_callable=collect_task_results,
        provide_context=True,
        trigger_rule="all_done",
    )

    # 이메일 전송
    send_summary_email = EmailOperator(
        task_id="send_summary_email",
        to="patturning1@gmail.com",
        subject="{{ task_instance.xcom_pull(task_ids='collect_task_results', key='email_subject') }}",
        html_content="{{ task_instance.xcom_pull(task_ids='collect_task_results', key='email_body') }}",
        trigger_rule="all_done",
    )

    [
        run_consumer_task,
        send_post_request_HOMEPLUS_task.expand(category_id=category_ids),
    ] >> collect_task_results_task >> send_summary_email

##### ##########
