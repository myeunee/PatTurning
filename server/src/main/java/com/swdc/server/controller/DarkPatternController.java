package com.swdc.server.controller;

import com.swdc.server.domain.darkPattern.DarkUI;
import com.swdc.server.domain.darkPattern.UI;
import lombok.NoArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@NoArgsConstructor
@RestController
@RequestMapping("/dark-patterns")
public class DarkPatternController {
//    @PostMapping
//    public List<DarkUI> detectDarkPattern(@RequestBody List<UI> request) {
//        /**
//        private List<UI> input = request;
//
//
//        request -> input -> model -> output -> response
//
//
//        private List<UI> response = output;
//
//         **/
//        return response;
//    }
}