const AWS = require("aws-sdk");
const { dynamodb } = require("../configs/dbConfig");

const createMessageTableIndexes = async () => {
  const params = {
    TableName: "Messages",
    AttributeDefinitions: [
      { AttributeName: "messageId", AttributeType: "S" },
      { AttributeName: "conversationId", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "conversationId-createdAt-index",
        KeySchema: [
          { AttributeName: "conversationId", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: {
          ProjectionType: "ALL",
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
    ],
  };

  try {
    console.log("Creating GSI for Messages table...");
    await dynamodb.updateTable(params).promise();
    console.log("GSI created successfully!");
  } catch (error) {
    if (error.code === "ResourceInUseException") {
      console.log("Index already exists");
    } else {
      console.error("Error creating GSI:", error);
      throw error;
    }
  }
};

createMessageTableIndexes()
  .then(() => console.log("Done"))
  .catch(console.error);
