from dotenv import load_dotenv
import os, json, requests
from airflow.operators.python import get_current_context
from airflow.exceptions import AirflowSkipException

""" collect_task_results(**context)
Airflow DAG 에서 태스크 결과를 수집, 태스크 상태를 확인 후 이메일 정보 XCom에 저장
"""
def collect_task_results(**context):
    # 실행 중인 DAG 에서 모든 태스크 인스턴스 가져옴
    task_instances = context['dag_run'].get_task_instances()
    
    # 각 태스크의 ID와 현재 상태 수집
    task_states = {task_instance.task_id: task_instance.state for task_instance in task_instances}
    
    platform = 'None'
    
    # 태스크 ID에 특정 키워드가 포함되어 있는지 확인하여 플랫폼 지정
    for k, y in task_states.items():
        if 'HOMEPLUS' in k:
            platform = 'HOMEPLUS'
        elif 'OASIS' in k:
            platform = 'OASIS'
    
    # 태스크 중 하나라도 실패하면 실패 알림 subject, body 설정
    if any(state == 'failed' for state in task_states.values()):
        email_subject = f"❗️[{platform}] Task Failure Alert "
        email_body = f"""
        <h3>하나 이상의 태스크가 실패했습니다!</h3>
        <p>태스크 상태:</p>
        <pre>{task_states}</pre>
        """
    else:
        # 태스크가 전부 성공하면 성공 알림 subject, body 설정
        email_subject = f"[{platform}] Task Success Alert"
        email_body = f"""
        <h3>모든 태스크가 성공적으로 완료되었습니다!</h3>
        <p>태스크 상태:</p>
        <pre>{task_states}</pre>
        """
    
    # XCom에 subject와 body 저장
    context['ti'].xcom_push(key='email_subject', value=email_subject)
    context['ti'].xcom_push(key='email_body', value=email_body)

""" send_post_request(platform, categoryId=0)
플랫폼에 따라 service url에 HTTP POST 요청하여 크롤링을 요청
"""
def send_post_request(platform, categoryId=0):
    load_dotenv() 
    
    url = ""
    
    # 'HP' 플랫폼(HOMEPLUS)인 경우 POST 요청
    if platform == 'HP':
        url = os.getenv("HOMEPLUS_SERVICE_URL")         # 요청할 service url
        headers = {"Content-Type": "application/json"}  # 요청 헤더: application/json
        data = json.dumps({"category_id": categoryId})  # category_id 전달을 위함
        response = requests.post(url, headers=headers, data=data)  # POST 요청
    
    # 'OA' 플랫폼(OASIS)인 경우 POST 요청
    elif platform == 'OA':
        url = os.getenv("OASIS_SERVICE_URL")  # 요청할 service url
        response = requests.post(url)         # POST 요청
    
    # 응답 처리
    if response.status_code == 200:  # 성공 시
        print(f"성공: {response.json()}")
    # 500 error 발생 시 task skip
    elif "500 Internal Server Error" in response.text:
        context = get_current_context()  # Airflow의 현재 태스크 컨텍스트
        raise AirflowSkipException(f"Skip task: {context['ti'].task_id}") # skip
    else:
        response.raise_for_status()  # 500 외의 오류가 발생하면 예외를 발생