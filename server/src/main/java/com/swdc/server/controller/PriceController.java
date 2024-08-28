/**
 * price-info 경로로 들어오는 모든 request를 받는 controller
 */

package com.swdc.server.controller;

import com.swdc.server.domain.mongoDB.Price;
import com.swdc.server.service.PriceService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.HandlerMapping;
import org.springframework.web.util.UriUtils;

import java.nio.charset.StandardCharsets;

@RequiredArgsConstructor
@RestController
@RequestMapping("/price-info")
public class PriceController {

    private final PriceService priceService;


    /**
     *
     *  플랫폼 이름, 카테고리 이름, 상품 id를 이용하여 priceService의 getProductDetails를 호출
     *
     *  encoded category_name을 decoded category_name으로 변환하여 priceService에 전달
     *  (%EC%B1%84%EC%86%8C -> 채소)
     *
     *  가격 정보를 담은 Price 객체(platform/category_name/product_id에 해당)를 반환
     */
    @GetMapping("{platform}/{product_id}/**")
    public Price getPriceInfo(@PathVariable String platform, HttpServletRequest request, @PathVariable String product_id) {
        String restOfPath = (String) request.getAttribute(HandlerMapping.PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE);
        String bestMatchPattern = (String) request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        String category_name = new AntPathMatcher().extractPathWithinPattern(bestMatchPattern, restOfPath);

        category_name = UriUtils.decode(category_name, StandardCharsets.UTF_8);

        return priceService.getProductDetails(platform, category_name, product_id);
    }

    @GetMapping("{platform}/{product_id}")
    public Price getPriceInfo(@PathVariable String platform, @PathVariable String product_id) {
        return priceService.getProductDetailsWithoutCategory(platform, product_id);
    }
}
