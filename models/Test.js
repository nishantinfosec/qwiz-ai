const testSchema = new mongoose.Schema({
  title: String,
  subject: String,
  difficulty: String,
});

export default mongoose.model("Test", testSchema);