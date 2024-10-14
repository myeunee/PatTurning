/**
 * save-text 경로로 들어오는 모든 request를 받는 controller
 */

package com.swdc.server.controller;

import com.swdc.server.service.TextService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

@RestController
@RequestMapping("/save-text")
public class TextController {

    @Autowired
    private TextService textService;

    /**
     *
     *  client로부터 json 형태의 user report를 전송받아, textService의 saveText에 request를 전달하여 호출
     *
     *  server instance 내부에 저장 성공 여부에 따라, 메세지 반환
     *
     */
    @PostMapping("")
    public String saveTextToFile(@RequestBody String request) {
        try {
            textService.saveText(request);
            return "File saved successfully!";
        } catch (IOException e) {
            e.printStackTrace();
            return "Failed to save file: " + e.getMessage();
        }
    }
}