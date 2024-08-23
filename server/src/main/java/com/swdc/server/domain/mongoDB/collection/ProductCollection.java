package com.swdc.server.domain.mongoDB.collection;

import com.swdc.server.domain.mongoDB.Product;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class ProductCollection {
    @Id
    private String id;

    private Integer category_id;
    private List<Product> products;
}
