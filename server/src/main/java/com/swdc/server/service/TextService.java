package com.swdc.server.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;

import java.io.FileWriter;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Service
public class TextService {

    private static final String FILE_PATH = "/mnt/report/report.txt";
    private static final DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private final ObjectMapper objectMapper = new ObjectMapper();

    public void saveText(String request) throws IOException {
        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Seoul"));
        String formattedTime = now.format(timeFormatter);

        ObjectNode jsonNode = (ObjectNode) objectMapper.readTree(request);
        jsonNode.put("time", formattedTime);

        String updatedJson = objectMapper.writeValueAsString(jsonNode);

        try (FileWriter fileWriter = new FileWriter(FILE_PATH, true)) {
            fileWriter.write(updatedJson + "\n");  // JSON 데이터 추가 (한 줄로)
        }
    }
}
