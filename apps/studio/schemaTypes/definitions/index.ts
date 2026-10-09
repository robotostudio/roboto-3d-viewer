import { button } from "@/schemaTypes/definitions/button";
import { customUrl } from "@/schemaTypes/definitions/custom-url";
import { pageBuilder } from "@/schemaTypes/definitions/pagebuilder";
import { product3dDefinitions } from "@/schemaTypes/definitions/product-3d";
import { productDetailDefinitions } from "@/schemaTypes/definitions/product-detail";
import { richText } from "@/schemaTypes/definitions/rich-text";

export const definitions = [
  customUrl,
  richText,
  button,
  pageBuilder,
  ...product3dDefinitions,
  ...productDetailDefinitions,
];
