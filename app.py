import pandas as pd
import numpy as np
import tensorflow as tf

from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from tensorflow.keras.preprocessing.sequence import pad_sequences
import pickle
import re
import json

app = Flask(__name__)
CORS(app)
app.config['JSON_AS_ASCII'] = False


# 모델 및 토크나이저 로드
model = tf.keras.models.load_model('clf_model.h5')
with open('tokenizer.pickle', 'rb') as handle:
    token = pickle.load(handle)
# 데이터 전처리
def clean_text(text):
    # 한글과 공백만 남기고 나머지 문자 제거
    cleaned_text = re.sub(r'[^가-힣\s]', '', text)
    return cleaned_text.strip()

def clean_data(data, token):
    data = data[~data['text'].str.match('^\d+$')]
    data = data[~data['text'].str.contains('\u200b')]
    
    data['text'] = data['text'].apply(clean_text)
    data = data[data['text'] != '']
    data.reset_index(drop=True, inplace=True)
    token_text = data['text'].copy()
    token_text = []
    
    for text in data['text']:
        if type(text)==str:
            token_text.append(text)
        else:
            # string이 아니면 공백
            token_text.append([])
    
    x = token.texts_to_sequences(token_text)
    padded_x = pad_sequences(x, 16)

    return data, padded_x

# 예측 수행
def predict(model, data, padded_x):
    predictions = model.predict(padded_x)
    
    # 가장 높은 확률을 가진 클래스 인덱스 추출
    predicted_classes = np.argmax(predictions, axis=1)
    
    result_list = []
    # 예측된 라벨과 해당 텍스트 출력
    for i, label in enumerate(predicted_classes):
        if label != 0:
            result_list.append({
                "text": data['text'].iloc[i],
                "xpath": data['xpath'].iloc[i],
                "label": int(label)
            })

    return result_list

@app.route('/predict', methods=['POST'])
def predict_route():
    try:
        
        # 클라이언트로부터 JSON 데이터 받기
        input_data = request.get_json()
        print(input_data)
        if input_data is None:
            return jsonify({"error": "No JSON data received"}), 400

        # 데이터프레임으로 변환
        texts = [item['text'] for item in input_data]
        xpaths = [item['xpath'] for item in input_data]

        data = pd.DataFrame({
            'text': texts,
            'xpath': xpaths
        })

        # 데이터 전처리
        try:
            data_pre, padded_x = clean_data(data, token)
        except Exception as e:
            return jsonify({"error": f"Data cleaning error: {str(e)}"}), 500

        # 예측 수행
        try:
            predictions = predict(model, data_pre, padded_x)
        except Exception as e:
            return jsonify({"error": f"Model prediction error: {str(e)}"}), 500

        # 결과를 JSON으로 반환
        return jsonify(predictions)

    except Exception as e:
        # 에러 메시지와 함께 500 상태 코드를 반환
        return jsonify({"error": str(e)}), 500



@app.route('/test', methods=['POST'])
def test_route():
    input_data = request.get_json()
    result = json.dumps(input_data, ensure_ascii=False)
    res = make_response(result)
    return res


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)
