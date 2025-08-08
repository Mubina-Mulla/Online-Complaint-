const express = require("express");
const cors = require("cors");
require("./config");
const {
  ComplaintSchema,
  UserSchema,
  AssignedComplaint,
  MessageSchema,
} = require("./Schema");

const app = express();
const PORT = 8000;

// Middleware
app.use(express.json());
app.use(cors());

/****************** Messages *******************************/
app.post("/messages", async (req, res) => {
  try {
    const { name, message, complaintId } = req.body;
    const messageData = new MessageSchema({ name, message, complaintId });
    const messageSaved = await messageData.save();
    res.status(200).json(messageSaved);
  } catch (error) {
    res.status(500).json({ error: "Failed to send message" });
  }
});

app.get("/messages/:complaintId", async (req, res) => {
  try {
    const { complaintId } = req.params;
    const messages = await MessageSchema.find({ complaintId }).sort("-createdAt");
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve messages" });
  }
});

/*********** User Signup ***********************************/
app.post("/SignUp", async (req, res) => {
  const user = new UserSchema(req.body);
  try {
    const resultUser = await user.save();
    res.send(resultUser);
  } catch (error) {
    res.status(500).send(error);
  }
});

/*********** User Login ************************************/
app.post("/Login", async (req, res) => {
  const { email, password } = req.body;
  const user = await UserSchema.findOne({ email });
  if (!user) {
    return res.status(401).json({ message: "User doesn’t exist" });
  }
  if (user.password === password) {
    res.json(user);
  } else {
    res.status(401).json({ message: "Invalid Credentials" });
  }
});

/*********** Fetch Agent Users *****************************/
app.get("/AgentUsers", async (req, res) => {
  try {
    const agentUsers = await UserSchema.find({ userType: "Agent" });
    if (agentUsers.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json(agentUsers);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/*********** Fetch Ordinary Users **************************/
app.get("/OrdinaryUsers", async (req, res) => {
  try {
    const users = await UserSchema.find({ userType: "Ordinary" });
    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/*********** Display Agent by ID ***************************/
app.get("/AgentUsers/:agentId", async (req, res) => {
  try {
    const { agentId } = req.params;
    const user = await UserSchema.findOne({ _id: agentId });
    if (user && user.userType === "Agent") {
      return res.status(200).json(user);
    }
    res.status(404).json({ error: "User not found" });
  } catch {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/*********** Delete Ordinary User **************************/
app.delete("/OrdinaryUsers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await UserSchema.findOne({ _id: id });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    await UserSchema.deleteOne({ _id: id });
    await ComplaintSchema.deleteOne({ userId: id });
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/*********** Register Complaint ****************************/
app.post("/Complaint/:id", async (req, res) => {
  const UserId = req.params.id;
  try {
    const user = await UserSchema.findById(UserId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const complaint = new ComplaintSchema(req.body);
    const resultComplaint = await complaint.save();
    res.status(200).send(resultComplaint);
  } catch (error) {
    res.status(500).json({ error: "Failed to register complaint" });
  }
});

/*********** Get Complaints by User ID *********************/
app.get("/status/:id", async (req, res) => {
  const userId = req.params.id;
  try {
    const user = await UserSchema.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const complaints = await ComplaintSchema.find({ userId });
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve user" });
  }
});

/*********** Get All Complaints (Admin) ********************/
app.get("/status", async (req, res) => {
  try {
    const complaint = await ComplaintSchema.find();
    res.json(complaint);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve Complaints" });
  }
});

/*********** Assign Complaint ******************************/
app.post("/assignedComplaints", (req, res) => {
  try {
    AssignedComplaint.create(req.body);
    res.sendStatus(201);
  } catch (error) {
    res.status(500).json({ error: "Failed to add assigned complaint" });
  }
});

/*********** Complaints in Agent Homepage ******************/
app.get("/allcomplaints/:agentId", async (req, res) => {
  try {
    const agentId = req.params.agentId;
    const complaints = await AssignedComplaint.find({ agentId });
    const complaintIds = complaints.map((c) => c.complaintId);
    const complaintDetails = await ComplaintSchema.find({ _id: { $in: complaintIds } });

    const updatedComplaints = complaints.map((complaint) => {
      const detail = complaintDetails.find(
        (d) => d._id.toString() === complaint.complaintId.toString()
      );
      return {
        ...complaint.toObject(),
        name: detail?.name,
        city: detail?.city,
        state: detail?.state,
        address: detail?.address,
        pincode: detail?.pincode,
        comment: detail?.comment,
      };
    });

    res.json(updatedComplaints);
  } catch (error) {
    res.status(500).json({ error: "Failed to get complaints" });
  }
});

/*********** Update User Profile ***************************/
app.put("/user/:_id", async (req, res) => {
  try {
    const { _id } = req.params;
    const { name, email, phone } = req.body;
    const user = await UserSchema.findByIdAndUpdate(
      _id,
      { name, email, phone },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to update the user" });
  }
});

/*********** Update Complaint Status ***********************/
app.put("/complaint/:complaintId", async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { status } = req.body;
    if (!complaintId || !status) {
      return res.status(400).json({ error: "Missing complaintId or status" });
    }

    const updatedComplaint = await ComplaintSchema.findByIdAndUpdate(
      complaintId,
      { status },
      { new: true }
    );

    await AssignedComplaint.findOneAndUpdate(
      { complaintId },
      { status },
      { new: true }
    );

    if (!updatedComplaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }
    res.json(updatedComplaint);
  } catch (error) {
    res.status(500).json({ error: "Failed to update complaint" });
  }
});

app.listen(PORT, () => console.log(`Server started at ${PORT}`));
