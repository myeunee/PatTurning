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