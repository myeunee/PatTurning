/**
 *
 *  client로부터 전달받는 모든 text를 저장하는 기능을 가진 service
 *
 */

package com.swdc.server.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;

import java.io.FileWriter;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Service
public class TextService {

    private static final String FILE_PATH = "/mnt/report/report.txt";
    private static final DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     *
     *  전달받은 request의 text를 전달받은 시간과 함께 server instance 내부의 "report.txt"에 저장
     *
     *  json 형태의 report가 한 줄씩 추가되는 형태
     *
     */
    public void saveText(String request) throws IOException {
        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Seoul"));
        String formattedTime = now.format(timeFormatter);

        ObjectNode jsonNode = (ObjectNode) objectMapper.readTree(request);
        jsonNode.put("time", formattedTime);

        String updatedJson = objectMapper.writeValueAsString(jsonNode);

        try (FileWriter fileWriter = new FileWriter(FILE_PATH, true)) {
            fileWriter.write(updatedJson + "\n");
        }
    }
}
