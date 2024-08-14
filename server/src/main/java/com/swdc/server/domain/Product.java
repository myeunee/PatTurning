package com.swdc.server.domain;

import lombok.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
public class Product {
    private String product_id;
    private Map<String, Integer> prices;
}
