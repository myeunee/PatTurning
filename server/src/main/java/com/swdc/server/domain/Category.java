package com.swdc.server.domain;


import lombok.*;
import org.springframework.data.annotation.Id;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class Category {
    private String category_name;
    private List<Product> products;
}
