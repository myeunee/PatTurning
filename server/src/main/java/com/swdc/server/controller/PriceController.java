package com.swdc.server.controller;

import com.swdc.server.domain.Price;
import com.swdc.server.service.PriceService;
import lombok.Data;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@Data
@RestController
@RequestMapping("/price-info")
public class PriceController {
    private final PriceService priceService;

    @GetMapping("{platform}/{category_name}/{product_id}")
    public Map<String, Integer> findPriceById(@PathVariable String platform, @PathVariable String category_name , @PathVariable String product_id) {
        Map<String, Integer> prices = priceService.getPrices(platform, category_name, product_id);

        return prices;
    }

}
