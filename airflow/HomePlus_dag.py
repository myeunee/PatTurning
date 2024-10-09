from modules import collect_task_results, send_post_request
from packages import *

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
        bash_command="python3 /home/patturning2/HomePlus_consumer.py {{ params.consumer }}",
    ).expand(params=generate_queue_values())

    category_ids = list(range(100001, 100078))


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
        to="patturning2@gmail.com",
        subject="{{ task_instance.xcom_pull(task_ids='collect_task_results', key='email_subject') }}",
        html_content="{{ task_instance.xcom_pull(task_ids='collect_task_results', key='email_body') }}",
        trigger_rule="all_done",
    )

    [
        run_consumer_task,
        send_post_request_HOMEPLUS_task.expand(category_id=category_ids),
    ] >> collect_task_results_task >> send_summary_email


