// Metro görselleri ImageSource olarak döndürür; TypeScript'in de bilmesi için.
declare module "*.png" {
  const source: import("react-native").ImageSourcePropType;
  export default source;
}
